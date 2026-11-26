import assert from 'node:assert/strict';
import {createApp} from '../../../src/server.js';
import {openDb} from '../../../src/db.js';
import {ownedEvent,updateEvent,publishEvent,listOwnedEvents} from '../../../src/events.js';
import {writeFileSync,appendFileSync,readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {setTimeout as sleep} from 'node:timers/promises';

const dir=new URL('./',import.meta.url), log=new URL('http-attempt2.jsonl',dir), summary=new URL('results-attempt2.json',dir);
writeFileSync(log,'');
const results=[];
function record(x){appendFileSync(log,JSON.stringify({at:new Date().toISOString(),monotonicMs:performance.now(),...x})+'\n');}
async function test(name,fn){try {const detail=await fn();results.push({name,status:'PASS',detail});record({test:name,status:'PASS',detail});}catch(e){results.push({name,status:'FAIL',error:e.stack});record({test:name,status:'FAIL',error:e.stack});} writeFileSync(summary,JSON.stringify(results,null,2));}
const db=openDb(':memory:'), app=createApp({db});
await new Promise(r=>app.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+app.address().port;
record({environment:{base,node:process.version,sha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),gateway:'defaults 3000/35000, worker100',db:':memory:',started:new Date().toISOString()}});
const key={'X-Api-Key':'catraca-partner-local'};
async function req(path,{method='GET',cookie,partner=false,headers={},body,raw}={}){
 const started=performance.now();const h={...(partner?key:{}),...headers,...(cookie?{Cookie:cookie}:{}),...((body!==undefined||raw!==undefined)?{'Content-Type':'application/json'}:{})};
 const r=await fetch(base+path,{method,headers:h,body:raw??(body!==undefined?JSON.stringify(body):undefined)});
 const text=await r.text();let data;try{data=JSON.parse(text);}catch{data=text;}
 const out={status:r.status,data,elapsed:performance.now()-started,cookie:r.headers.get('set-cookie')?.split(';')[0]};
 record({request:{method,path,auth:cookie?'session':partner?'partner':headers['X-Api-Key']?'invalid-key':'none',body:body?{...body,password:body.password?'[demo credential]':undefined}:undefined,raw},response:{status:r.status,data,elapsed:out.elapsed}});return out;
}
function exact(r,status,data){assert.equal(r.status,status);assert.deepEqual(r.data,data);}
function keys(data,wanted){assert.deepEqual(Object.keys(data).sort(),wanted.sort());}
const future=new Date(Date.now()+86400000*7).toISOString();
const input=(patch={})=>({name:'Independent evaluation',startsAt:future,location:'Evaluation',capacity:10,priceCents:10000,...patch});
const buybody=(suffix='0001',email='participante@catraca.local')=>({buyerEmail:email,cardNumber:'400000000000'+suffix});
const login=async(email)=>(await req('/api/auth/login',{method:'POST',body:{email,password:'Catraca123!'}}));
const A=await login('organizador.a@catraca.local'), B=await login('organizador.b@catraca.local'), P=await login('participante@catraca.local');
const Q=await req('/api/auth/register',{method:'POST',body:{name:'Second participant',email:'second-eval@example.com',password:'Catraca123!'}});
const create=async(patch={},cookie=A.cookie)=>{const r=await req('/api/organizer/events',{method:'POST',cookie,body:input(patch)});assert.equal(r.status,201);return r.data;};
const publish=async(e)=>{const r=await req('/api/organizer/events/'+e.id+'/publish',{method:'POST',cookie:A.cookie});assert.equal(r.status,200);return r.data;};
const partnerBuy=async(e,suffix='0001',email)=>req('/api/partner/events/'+e.id+'/purchases',{method:'POST',partner:true,body:buybody(suffix,email)});
const webBuy=async(e,suffix='0001',cookie=P.cookie)=>req('/api/events/'+e.id+'/purchases',{method:'POST',cookie,body:{cardNumber:'400000000000'+suffix}});
const query=async(t)=>req('/api/partner/tickets/'+t.ticketId,{partner:true});
const dash=async(e)=>(await req('/api/organizer/events/'+e.id+'/dashboard',{cookie:A.cookie})).data;
const check=async(e,code)=>req('/api/organizer/events/'+e.id+'/check-in',{method:'POST',cookie:A.cookie,body:{code}});
const cancel=async(e)=>req('/api/organizer/events/'+e.id+'/cancel',{method:'POST',cookie:A.cookie});
const metric=(confirmed,pending,checkedIn,availableSeats,revenueCents,refunded)=>({confirmed,pending,checkedIn,availableSeats,revenueCents,refunded});

const heartbeat=setInterval(()=>record({heartbeat:true,wallMs:Date.now()}),500);
try{
 let draft,eventB,validation;
 await test('F03-T01 creation validation',async()=>{
  const before=db.prepare('select count(*) n from events').get().n;
  const bad=[{},input({startsAt:'2000-01-01'}),input({capacity:0}),input({capacity:1.5}),input({priceCents:0}),input({priceCents:0.5}),input({name:' '}),input({location:' '}),input({startsAt:'garbage'})];
  for(const field of ['name','startsAt','location','capacity','priceCents']){const x=input();delete x[field];bad.push(x);}
  for(const body of bad)exact(await req('/api/organizer/events',{method:'POST',cookie:A.cookie,body}),422,{error:'invalid_request'});
  assert.equal(db.prepare('select count(*) n from events').get().n,before);
  draft=await create({name:'Draft'});assert.equal(draft.status,'draft');eventB=await create({name:'B private'},B.cookie);validation=await publish(await create({name:'Validation',capacity:3}));return {invalidCases:bad.length};
 });
 await test('F03-T03 draft catalog and F04-CF04 draft cannot sell',async()=>{
  for(const path of ['/api/events','/api/partner/events']){const r=await req(path,{partner:path.includes('partner')});assert.ok(!r.data.some(x=>x.id===draft.id));assert.ok(r.data.some(x=>x.id===validation.id));}
  exact(await partnerBuy(draft),404,{error:'event_not_available'});
 });
 await test('F03-T04 T06 CF11 domain and HTTP ownership',async()=>{
  for(const action of [()=>ownedEvent(db,B.data.user.id,validation.id),()=>updateEvent(db,B.data.user.id,validation.id,input()),()=>publishEvent(db,B.data.user.id,validation.id)])assert.throws(action,e=>e.status===404);
  assert.ok(listOwnedEvents(db,B.data.user.id).every(x=>x.organizerId===B.data.user.id));
  for(const actor of [{cookie:undefined,status:401,error:'unauthorized'},{cookie:P.cookie,status:403,error:'forbidden'},{cookie:B.cookie,status:404,error:'event_not_found'}]){
   for(const route of [{suffix:'',method:'GET'},{suffix:'',method:'PUT',body:input()},{suffix:'/publish',method:'POST'}])exact(await req('/api/organizer/events/'+validation.id+route.suffix,{...route,cookie:actor.cookie}),actor.status,{error:actor.error});
  }
  assert.equal((await req('/api/organizer/events/'+validation.id,{cookie:A.cookie})).data.id,validation.id);
  for(const user of [A,B]){const list=await req('/api/organizer/events',{cookie:user.cookie});assert.ok(list.data.every(x=>x.organizerId===user.data.user.id));}
 });
 const temporal=await publish(await create({name:'Temporal all suffixes',capacity:10}));
 const temporals=[];
 await test('F04-T01 immediate reservation both channels and immutable price',async()=>{
  for(const [i,suffix] of ['0001','0002','0003','0004','9876'].entries()){
   const start=performance.now(),r=i%2===0?await partnerBuy(temporal,suffix):await webBuy(temporal,suffix);
   assert.equal(r.status,202);keys(r.data,['ticketId','code','status']);assert.equal(r.data.status,'pending');assert.ok(r.elapsed<2000);assert.equal(typeof r.data.ticketId,'string');assert.equal(typeof r.data.code,'string');temporals.push({suffix,start,...r.data});
  }
  assert.equal(new Set(temporals.map(x=>x.ticketId)).size,5);assert.equal(new Set(temporals.map(x=>x.code)).size,5);
  const rows=db.prepare('select * from tickets where eventId=?').all(temporal.id);assert.ok(rows.every(x=>x.priceCents===10000&&x.status==='pending'));assert.equal((await dash(temporal)).availableSeats,5);
  record({databaseRows:rows});assert.ok(!JSON.stringify(rows).includes('400000000000'));return {immediateMs:'see per request',occupied:5};
 });
 const temporalPoll=(async()=>{
  const observed=[];
  while(observed.length<temporals.length){
   for(const t of temporals.filter(x=>!observed.some(o=>o.suffix===x.suffix))){const r=await query(t);if(r.data.status!=='pending')observed.push({suffix:t.suffix,status:r.data.status,elapsed:performance.now()-t.start});}
   if(performance.now()-temporals[0].start>42000)break;await sleep(100);
  }
  return observed;
 })();
 await test('F04-T05 key first exact errors and malformed bodies',async()=>{
  const routes=[{path:'/api/partner/events'},{path:'/api/partner/tickets/missing'},{path:'/api/partner/events/missing/purchases',method:'POST',raw:'{broken'}];
  for(const route of routes)for(const headers of [{},{'X-Api-Key':'wrong'}])exact(await req(route.path,{...route,headers}),401,{error:'unauthorized'});
  const count=db.prepare('select count(*) n from tickets').get().n;
  for(const body of [{},{buyerEmail:'bad',cardNumber:'4000000000000001'},buybody('0001'),{buyerEmail:'a@b.com',cardNumber:4000000000000001}]){
   if(body.cardNumber==='4000000000000001'&&body.buyerEmail!=='bad')body.cardNumber='123';
   exact(await req('/api/partner/events/missing/purchases',{method:'POST',partner:true,body}),422,{error:'invalid_request'});
  }
  for(const raw of ['null','[]','{broken'])exact(await req('/api/partner/events/missing/purchases',{method:'POST',partner:true,raw}),422,{error:'invalid_request'});
  for(const cardNumber of ['123','40000000000000011','400000000000000x',' 000000000000001'])exact(await req('/api/partner/events/'+temporal.id+'/purchases',{method:'POST',partner:true,body:{buyerEmail:'a@b.com',cardNumber}}),422,{error:'invalid_request'});
  assert.equal(db.prepare('select count(*) n from tickets').get().n,count);
  exact(await partnerBuy({id:'missing'}),404,{error:'event_not_available'});exact(await req('/api/partner/tickets/missing',{partner:true}),404,{error:'ticket_not_found'});
 });
 await test('F04-T06 exact partner schemas and types',async()=>{
  const listing=await req('/api/partner/events',{partner:true});assert.equal(listing.status,200);
  for(const e of listing.data){keys(e,['id','name','startsAt','priceCents','availableSeats']);for(const k of ['id','name','startsAt'])assert.equal(typeof e[k],'string');for(const k of ['priceCents','availableSeats'])assert.ok(Number.isInteger(e[k]));}
  for(const t of temporals){const r=await query(t);assert.equal(r.status,200);keys(r.data,['ticketId','code','eventId','status','checkedIn']);assert.equal(r.data.checkedIn,false);for(const k of ['ticketId','code','eventId','status'])assert.equal(typeof r.data[k],'string');}
 });
 await test('F04-T07 CF03 ownership and same email distinct channels',async()=>{
  const e=await publish(await create({name:'Channel ownership'}));const p=await webBuy(e),api=await partnerBuy(e),q=await webBuy(e,'0001',Q.cookie);
  for(const r of [p,api,q])assert.equal(r.status,202);
  for(const [actor,yes,no] of [[P,p,[api,q]],[Q,q,[p,api]]]){const r=await req('/api/tickets',{cookie:actor.cookie});assert.ok(r.data.some(t=>t.ticketId===yes.data.ticketId&&t.code===yes.data.code&&t.eventName===e.name));for(const other of no)assert.ok(!r.data.some(t=>t.ticketId===other.data.ticketId));}
  assert.equal(db.prepare('select userId from tickets where id=?').get(api.data.ticketId).userId,null);
  exact(await req('/api/events/'+e.id+'/purchases',{method:'POST',body:{cardNumber:'4000000000000001'}}),401,{error:'unauthorized'});
  exact(await webBuy(e,'0001',A.cookie),403,{error:'forbidden'});
 });
 let e1,e1tickets=[];
 await test('F03-T02 CF02 live occupied capacity atomicity',async()=>{
  const p=await partnerBuy(validation,'0003'),q=await webBuy(validation,'0003');assert.equal(p.status,202);assert.equal(q.status,202);
  const before=(await req('/api/organizer/events/'+validation.id,{cookie:A.cookie})).data;
  exact(await req('/api/organizer/events/'+validation.id,{method:'PUT',cookie:A.cookie,body:input({capacity:1,name:'Must rollback'})}),409,{error:'capacity_below_occupied'});
  assert.deepEqual((await req('/api/organizer/events/'+validation.id,{cookie:A.cookie})).data,before);
  const expanded=await req('/api/organizer/events/'+validation.id,{method:'PUT',cookie:A.cookie,body:input({capacity:5})});assert.equal(expanded.status,200);assert.equal(expanded.data.availableSeats,3);
  exact(await req('/api/organizer/events/'+validation.id,{method:'PUT',cookie:A.cookie,body:input({startsAt:'2000-01-01'})}),422,{error:'invalid_request'});
 });
 await test('F05 E1 setup historical 100 100 150',async()=>{
  e1=await publish(await create({name:'E1',capacity:3}));e1tickets.push((await webBuy(e1)).data,(await partnerBuy(e1)).data);
  const updated=await req('/api/organizer/events/'+e1.id,{method:'PUT',cookie:A.cookie,body:input({name:'E1',capacity:3,priceCents:15000})});assert.equal(updated.status,200);
  e1tickets.push((await partnerBuy(e1)).data);exact(await partnerBuy(e1),409,{error:'sold_out'});
  exact(await req('/api/partner/events/'+e1.id+'/purchases',{method:'POST',partner:true,body:{}}),422,{error:'invalid_request'});
  assert.deepEqual(db.prepare('select priceCents from tickets where eventId=? order by createdAt,id').all(e1.id).map(x=>x.priceCents),[10000,10000,15000]);
 });
 const bursts=[];
 await test('F04-T03 three independent bursts 30 concurrent requests',async()=>{
  for(let round=1;round<=3;round++){
   const event=await publish(await create({name:'Burst '+round,capacity:5}));const rs=await Promise.all(Array.from({length:30},(_,i)=>partnerBuy(event,'0001','load'+round+'-'+i+'@example.com')));
   const counts={};for(const r of rs){counts[r.status]=(counts[r.status]??0)+1;if(r.status===409)assert.deepEqual(r.data,{error:'sold_out'});}
   assert.deepEqual(counts,{'202':5,'409':25});const occupied=db.prepare("select count(*) n from tickets where eventId=? and status in ('pending','confirmed')").get(event.id).n;assert.equal(occupied,5);bursts.push({event,counts});record({burst:round,counts,occupied});
  }return bursts.map(x=>({eventId:x.event.id,counts:x.counts}));
 });
 let e3,fast,slow,cancelAt;
 await test('F05 E3 setup real fast and slow plus R10 pending',async()=>{
  e3=await publish(await create({name:'E3',capacity:2}));fast=(await webBuy(e3)).data;slow=(await partnerBuy(e3,'0003')).data;
  exact(await check(e3,slow.code),200,{message:'Ingresso não confirmado'});
  await sleep(3200);assert.equal((await query(fast)).data.status,'confirmed');assert.equal((await query(slow)).data.status,'pending');
  assert.deepEqual(await dash(e3),metric(1,1,0,0,10000,0));exact(await check(e3,fast.code),200,{message:'Entrada liberada'});assert.deepEqual(await dash(e3),metric(1,1,1,0,10000,0));
 });
 await test('F05-T05 E1 dashboard and T04 simultaneous single admission',async()=>{
  assert.deepEqual(await dash(e1),metric(3,0,0,0,35000,0));
  const rs=await Promise.all(Array.from({length:12},()=>check(e1,e1tickets[0].code)));assert.equal(rs.filter(r=>r.data.message==='Entrada liberada').length,1);assert.equal(rs.filter(r=>r.data.message==='Ingresso já utilizado').length,11);
  exact(await check(e1,e1tickets[0].code),200,{message:'Ingresso já utilizado'});assert.deepEqual(await dash(e1),metric(3,0,1,0,35000,0));const ticket=await query(e1tickets[0]);assert.equal(ticket.data.status,'confirmed');assert.equal(ticket.data.checkedIn,true);
  for(const burst of bursts)assert.deepEqual(await dash(burst.event),metric(5,0,0,0,50000,0));
 });
 await test('F05-T07 CF06 all operation actor matrix',async()=>{
  for(const actor of [{cookie:undefined,status:401,error:'unauthorized'},{cookie:P.cookie,status:403,error:'forbidden'},{cookie:B.cookie,status:404,error:'event_not_found'}])for(const action of ['dashboard','cancel','check-in']){
   exact(await req('/api/organizer/events/'+e3.id+'/'+action,{method:action==='dashboard'?'GET':'POST',cookie:actor.cookie,...(action==='check-in'?{raw:'{broken'}:{})}),actor.status,{error:actor.error});
  }
  assert.deepEqual(await dash(e3),metric(1,1,1,0,10000,0));
 });
 await test('F05-T01 T02 T06 integrated cancellation',async()=>{
  exact(await cancel(draft),409,{error:'event_not_published'});cancelAt=performance.now();const r=await cancel(e3);assert.equal(r.status,200);assert.equal(r.data.status,'cancelled');
  assert.equal((await query(fast)).data.status,'refunded');assert.equal((await query(slow)).data.status,'cancelled');assert.ok(performance.now()-cancelAt<10000);assert.deepEqual(await dash(e3),metric(0,0,0,0,0,1));
  exact(await cancel(e3),409,{error:'event_cancelled'});
 });
 await test('F03-T03 T05 and F05-T01 cancelled blocked everywhere',async()=>{
  for(const path of ['/api/events','/api/partner/events']){const r=await req(path,{partner:path.includes('partner')});assert.ok(!r.data.some(x=>x.id===e3.id));}
  exact(await partnerBuy(e3),404,{error:'event_not_available'});exact(await webBuy(e3),404,{error:'event_not_available'});
  exact(await req('/api/organizer/events/'+e3.id,{method:'PUT',cookie:A.cookie,body:input()}),409,{error:'event_cancelled'});
  exact(await req('/api/organizer/events/'+e3.id+'/publish',{method:'POST',cookie:A.cookie}),409,{error:'event_cancelled'});
  for(const fn of [()=>updateEvent(db,A.data.user.id,e3.id,input()),()=>publishEvent(db,A.data.user.id,e3.id)])assert.throws(fn,e=>e.status===409&&e.error==='event_cancelled');
 });
 await test('F05-T03 literal R10 full precedence',async()=>{
  exact(await check(e1,'MISSING'),200,{message:'Ingresso inválido para este evento'});
  exact(await check(e1,slow.code),200,{message:'Ingresso inválido para este evento'});
  exact(await check(e3,'MISSING'),200,{message:'Ingresso inválido para este evento'});
  exact(await check(e3,e1tickets[0].code),200,{message:'Ingresso inválido para este evento'});
  exact(await check(e3,fast.code),200,{message:'Evento cancelado'});exact(await check(e3,slow.code),200,{message:'Evento cancelado'});
  exact(await check(temporal,temporals.find(x=>x.suffix==='0002').code),200,{message:'Ingresso não confirmado'});
 });
 await test('F04-T02 T04 default real gateway timings all five suffixes',async()=>{
  const observed=await temporalPoll;record({gatewayTimings:observed});assert.equal(observed.length,5);
  for(const o of observed){const slow=['0003','0004'].includes(o.suffix);assert.ok(o.elapsed>=(slow?30000:2000)&&o.elapsed<=(slow?40000:5000),JSON.stringify(o));assert.equal(o.status,['0001','0003'].includes(o.suffix)?'confirmed':'declined');}
  assert.deepEqual(await dash(temporal),metric(2,0,0,8,20000,0));return observed;
 });
 await test('F04-T04 F05-T02 T06 CF05 state preserved 45s after cancellation',async()=>{
  await sleep(Math.max(0,cancelAt+45100-performance.now()));const f=await query(fast),s=await query(slow);assert.equal(f.data.status,'refunded');assert.equal(s.data.status,'cancelled');assert.equal(f.data.checkedIn,true);assert.deepEqual(await dash(e3),metric(0,0,0,0,0,1));
  return {elapsedAfterCancel:performance.now()-cancelAt,fast:f.data,slow:s.data};
 });
 await test('Source transaction and auth dependency inspection',()=>{
  const read=p=>readFileSync(new URL('../../../src/'+p,import.meta.url),'utf8');for(const p of ['purchases.js','operations.js','events.js'])assert.ok(read(p).includes('transaction(db,'));assert.ok(read('db.js').includes("db.exec('BEGIN IMMEDIATE')"));assert.ok(!read('events.js').match(/^import.*auth/m));return {transactionProtocol:'BEGIN IMMEDIATE synchronous',domain:'events auth lazy-loaded only in HTTP handler'};
 });
}finally{
 clearInterval(heartbeat);await new Promise(r=>app.close(r));db.close();record({cleanup:'HTTP listener closed and fresh memory database closed',finished:new Date().toISOString()});
}
console.log(JSON.stringify(results,null,2));
process.exitCode=results.some(x=>x.status==='FAIL')?1:0;
