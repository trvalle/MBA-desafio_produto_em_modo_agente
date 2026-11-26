import assert from 'node:assert/strict';
import { createApp } from './src/server.js';
import { openDb } from './src/db.js';
import { requireUser } from './src/auth.js';
import { ownedEvent, updateEvent, publishEvent, listOwnedEvents } from './src/events.js';
const db = openDb(':memory:');
const app = createApp({db}); // Production default handlers; no handler injection.
await new Promise(resolve => app.listen(0,'127.0.0.1',resolve));
const base = `http://127.0.0.1:${app.address().port}`;
console.log(JSON.stringify({dateUTC:new Date().toISOString(),node:process.version,base,handlers:'createApp defaults',sha:'37aae3fc15f3423f88806c6cc824cd0435088259'}));
let assertions=0;
function check(condition,label){assert.ok(condition,label);assertions++;console.log('PASS '+label);}
function throws(fn,status,label){assert.throws(fn,e=>e.status===status);assertions++;console.log('PASS '+label);}
async function req(label,path,{method='GET',data,cookie}={}){
 const response=await fetch(base+path,{method,headers:{...(data!==undefined?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:data===undefined?undefined:JSON.stringify(data)});
 const body=await response.json();const setCookie=response.headers.get('set-cookie');
 console.log(JSON.stringify({label,method,path,input:data?{...data,password:data.password?'[redacted]':undefined}:undefined,status:response.status,body,setCookie:setCookie?.replace(/catraca_session=[^;]+/,'catraca_session=[redacted]')}));
 check(!/password|hash/i.test(JSON.stringify(body)),label+' no password/hash response');
 return {status:response.status,body,cookie:setCookie?.split(';')[0],setCookie};
}
try{
 const registration={name:'Independent evaluator',email:'eval-37aae3f@example.com',password:'Independent123!',role:'organizer'};
 const registered=await req('F02-T01/T02 register','/api/auth/register',{method:'POST',data:registration});
 check(registered.status===201&&registered.body.user.role==='participant','registration remains participant');
 check(db.prepare('SELECT role FROM users WHERE id=?').get(registered.body.user.id).role==='participant','persisted role participant');
 check(['HttpOnly','SameSite=Strict','Path=/'].every(flag=>registered.setCookie.includes(flag)),'F02-T03 cookie attributes');
 let me=await req('F02-T01 initial me','/api/auth/me',{cookie:registered.cookie});
 check(me.body.user.id===registered.body.user.id,'registration session active');
 const logout=await req('F02-T01 logout','/api/auth/logout',{method:'POST',cookie:registered.cookie});
 check(logout.status===200&&logout.body.user===null&&logout.setCookie.includes('Max-Age=0'),'logout response and expiry');
 me=await req('F02-T03 replay revoked cookie','/api/auth/me',{cookie:registered.cookie});check(me.body.user===null,'revoked cookie rejected');
 const relogin=await req('F02-T01 login new account','/api/auth/login',{method:'POST',data:registration});
 check(relogin.status===200,'new account login');
 me=await req('F02-T01 me after login','/api/auth/me',{cookie:relogin.cookie});check(me.body.user.id===registered.body.user.id,'login session active');
 const accounts={};
 for(const [key,email,role] of [['a','organizador.a@catraca.local','organizer'],['b','organizador.b@catraca.local','organizer'],['p','participante@catraca.local','participant']]){
  accounts[key]=await req('F02-T04/CF01 seed '+key,'/api/auth/login',{method:'POST',data:{email,password:'Catraca123!'}});
  check(accounts[key].status===200&&accounts[key].body.user.role===role,'seed '+key+' role');
  const bad=await req('F02-T04 wrong password '+key,'/api/auth/login',{method:'POST',data:{email,password:'wrong-password'}});
  check(bad.status===401&&!bad.setCookie,'wrong password '+key+' no session');
 }
 throws(()=>requireUser(db,{headers:{}},'organizer'),401,'F02-T05 helper visitor');
 throws(()=>requireUser(db,{headers:{cookie:accounts.p.cookie}},'organizer'),403,'F02-T05 helper participant');
 check(requireUser(db,{headers:{cookie:accounts.a.cookie}},'organizer').id===accounts.a.body.user.id,'F02-T05 helper organizer');
 const input={name:'Evaluator event A',startsAt:new Date(Date.now()+7*86400000).toISOString(),location:'Isolated test',capacity:5,priceCents:12345};
 const eventA=await req('F03-T01 valid creation','/api/organizer/events',{method:'POST',cookie:accounts.a.cookie,data:{...input,status:'published',organizerId:accounts.b.body.user.id}});
 check(eventA.status===201&&eventA.body.status==='draft'&&eventA.body.organizerId===accounts.a.body.user.id,'created draft with actual owner');
 const id=eventA.body.id;const detail='/api/organizer/events/'+id;
 const invalid=[{},...['name','startsAt','location','capacity','priceCents'].map(field=>{const value={...input};delete value[field];return value;}),{...input,startsAt:'2000-01-01T00:00:00Z'},{...input,capacity:0},{...input,capacity:1.5},{...input,priceCents:0},{...input,priceCents:1.5}];
 for(const [index,data] of invalid.entries()){
  const response=await req('F03-T01 invalid '+index,'/api/organizer/events',{method:'POST',cookie:accounts.a.cookie,data});check(response.status===422,'invalid event '+index+' rejected');
 }
 check(db.prepare('SELECT COUNT(*) n FROM events').get().n===1,'invalid creates do not persist');
 const eventB=await req('F03-T04 owner B create','/api/organizer/events',{method:'POST',cookie:accounts.b.cookie,data:{...input,name:'Evaluator private B'}});
 check(eventB.status===201,'owner B event created');
 let catalog=await req('F03-T03 drafts hidden','/api/events');check(catalog.body.length===0,'drafts absent public catalog');
 let published=await req('F03-CF02 publish',detail+'/publish',{method:'POST',cookie:accounts.a.cookie});check(published.status===200&&published.body.status==='published','publication persists');
 for(const [index,status] of ['pending','confirmed','declined','refunded','cancelled'].entries())db.prepare('INSERT INTO tickets(id,code,eventId,buyerEmail,priceCents,status,createdAt,dueAt,approved) VALUES(?,?,?,?,?,?,?,?,?)').run('fixture-'+index,'FIXTURE-'+index,id,'buyer@example.com',12345,status,Date.now(),Date.now()+60000,1);
 console.log('FIXTURE tickets: one each pending, confirmed, declined, refunded, cancelled; occupation must be 2');
 catalog=await req('F03-T03 published catalog with occupancy','/api/events');check(catalog.body.length===1&&catalog.body[0].id===id&&catalog.body[0].availableSeats===3&&catalog.body[0].priceCents===12345,'catalog price and pending+confirmed availability');
 const before=JSON.stringify(ownedEvent(db,accounts.a.body.user.id,id));
 const rejected=await req('F03-T02/CF02 reduction rollback',detail,{method:'PUT',cookie:accounts.a.cookie,data:{...input,capacity:1,name:'MUST NOT PERSIST',priceCents:999}});
 check(rejected.status===409&&rejected.body.error==='capacity_below_occupied','capacity below occupancy rejected');
 check(JSON.stringify(ownedEvent(db,accounts.a.body.user.id,id))===before&&!db.isTransaction,'full event unchanged and transaction closed');
 const past=await req('F03-T02 past edit',detail,{method:'PUT',cookie:accounts.a.cookie,data:{...input,startsAt:'2000-01-01T00:00:00Z'}});check(past.status===422,'past edit rejected');
 check(JSON.stringify(ownedEvent(db,accounts.a.body.user.id,id))===before,'past edit unchanged');
 const increased=await req('F03-T02 capacity increase',detail,{method:'PUT',cookie:accounts.a.cookie,data:{...input,capacity:8,priceCents:15000}});check(increased.status===200&&increased.body.capacity===8&&increased.body.availableSeats===6,'capacity increase accepted');
 check(db.prepare('SELECT priceCents FROM tickets').all().every(t=>t.priceCents===12345),'historical fixture prices unchanged');
 for(const key of ['a','b']){
  const list=await req('F03-T04 HTTP own list '+key,'/api/organizer/events',{cookie:accounts[key].cookie});check(list.status===200&&list.body.length===1&&list.body.every(e=>e.organizerId===accounts[key].body.user.id),'HTTP list isolated '+key);
  check(listOwnedEvents(db,accounts[key].body.user.id).every(e=>e.organizerId===accounts[key].body.user.id),'domain list isolated '+key);
 }
 for(const [key,status] of [['visitor',401],['p',403],['b',404]]){
  for(const [path,method,data] of [[detail,'GET'],[detail,'PUT',input],[detail+'/publish','POST']]){
   const response=await req('F03-T04/T06/CF11 '+key+' '+method,path,{method,data,cookie:accounts[key]?.cookie});check(response.status===status&&Object.keys(response.body).join()==='error','protected detail '+key+' '+method);
  }
  if(key!=='b')for(const method of ['GET','POST']){
   const response=await req('F02-T05/F03-CF11 collection '+key+' '+method,'/api/organizer/events',{method,data:method==='POST'?input:undefined,cookie:accounts[key]?.cookie});check(response.status===status,'protected collection '+key+' '+method);
  }
 }
 const own=await req('F03-T06 owner direct ID',detail,{cookie:accounts.a.cookie});check(own.status===200&&own.body.id===id,'owner direct GET succeeds');
 for(const owner of [accounts.b.body.user.id,accounts.p.body.user.id])for(const [name,fn] of [['ownedEvent',()=>ownedEvent(db,owner,id)],['updateEvent',()=>updateEvent(db,owner,id,input)],['publishEvent',()=>publishEvent(db,owner,id)]])throws(fn,404,'F03-T04 domain '+name+' denies '+owner);
 const missingCancel=await req('F03-T03 cancellation dependency',detail+'/cancel',{method:'POST',cookie:accounts.a.cookie});check(missingCancel.status===404,'F05 absent at evaluated SHA: T03 integrated cancellation BLOCKED');
 db.prepare("UPDATE events SET status='cancelled' WHERE id=?").run(id);console.log('FIXTURE state cancelled, expressly allowed by F03-T05; does not prove integrated cancel');
 catalog=await req('F03 cancellation fixture catalog','/api/events');check(catalog.body.length===0,'cancelled fixture absent catalog');
 for(const [method,path,data] of [['PUT',detail,input],['POST',detail+'/publish']]){
  const response=await req('F03-T05 cancelled '+method,path,{method,data,cookie:accounts.a.cookie});check(response.status===409&&response.body.error==='event_cancelled','cancelled '+method+' rejected');
 }
 check(ownedEvent(db,accounts.a.body.user.id,id).availableSeats===0,'cancelled availability zero');
 console.log(JSON.stringify({result:'all executed assertions passed',assertions,F02:'PASS',F03:'BLOCKED F03-T03 until integrated F05 cancellation',finishedUTC:new Date().toISOString()}));
}finally{await new Promise(resolve=>app.close(resolve));db.close();}
