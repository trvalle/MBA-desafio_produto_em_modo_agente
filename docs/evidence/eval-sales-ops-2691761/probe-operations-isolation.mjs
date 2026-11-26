import assert from 'node:assert/strict';
import {createApp} from '../../../src/server.js';
import {openDb} from '../../../src/db.js';
import {appendFileSync,writeFileSync} from 'node:fs';
import {setTimeout as sleep} from 'node:timers/promises';
const log=new URL('operations-isolation.jsonl',import.meta.url);writeFileSync(log,'');
const emit=x=>appendFileSync(log,JSON.stringify({at:new Date().toISOString(),monotonicMs:performance.now(),...x})+'\n');
const db=openDb(':memory:'),app=createApp({db});await new Promise(r=>app.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+app.address().port;emit({environment:{base,node:process.version,scenario:'Preconfirm fast before creating slow, to isolate cancellation semantics from observed premature slow gateway'}});
const key={'X-Api-Key':'catraca-partner-local'};
async function req(path,{method='GET',cookie,body,partner=false}={}){const r=await fetch(base+path,{method,headers:{...(cookie?{Cookie:cookie}:{}),...(partner?key:{}),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});const data=await r.json();emit({request:{path,method,auth:partner?'partner':cookie?'session':'none',body:body?{...body,password:undefined}:undefined},response:{status:r.status,data}});return {status:r.status,data,cookie:r.headers.get('set-cookie')?.split(';')[0]};}
try{
 const A=await req('/api/auth/login',{method:'POST',body:{email:'organizador.a@catraca.local',password:'Catraca123!'}}),P=await req('/api/auth/login',{method:'POST',body:{email:'participante@catraca.local',password:'Catraca123!'}});
 const scenarios=[];
 for(const fastChannel of ['partner','web']){
  const e=(await req('/api/organizer/events',{method:'POST',cookie:A.cookie,body:{name:'Operations isolation '+fastChannel,startsAt:new Date(Date.now()+86400000*7).toISOString(),location:'Local',capacity:2,priceCents:10000}})).data;
  await req('/api/organizer/events/'+e.id+'/publish',{method:'POST',cookie:A.cookie});
  const buy=async(channel,suffix)=>(await req((channel==='partner'?'/api/partner/events/':'/api/events/')+e.id+'/purchases',{method:'POST',partner:channel==='partner',cookie:channel==='web'?P.cookie:undefined,body:{buyerEmail:'participante@catraca.local',cardNumber:'400000000000'+suffix}})).data;
  const fast=await buy(fastChannel,'0001');const start=performance.now();let status;
  do{await sleep(100);status=(await req('/api/partner/tickets/'+fast.ticketId,{partner:true})).data.status;}while(status==='pending'&&performance.now()-start<6000);
  assert.equal(status,'confirmed');
  assert.deepEqual((await req('/api/organizer/events/'+e.id+'/check-in',{method:'POST',cookie:A.cookie,body:{code:fast.code}})).data,{message:'Entrada liberada'});
  const slow=await buy(fastChannel==='partner'?'web':'partner','0003');assert.equal(slow.status,'pending');
  assert.deepEqual((await req('/api/organizer/events/'+e.id+'/dashboard',{cookie:A.cookie})).data,{confirmed:1,pending:1,checkedIn:1,availableSeats:0,revenueCents:10000,refunded:0});
  const cancelledAt=performance.now();await req('/api/organizer/events/'+e.id+'/cancel',{method:'POST',cookie:A.cookie});
  assert.equal((await req('/api/partner/tickets/'+fast.ticketId,{partner:true})).data.status,'refunded');assert.equal((await req('/api/partner/tickets/'+slow.ticketId,{partner:true})).data.status,'cancelled');
  const expected={confirmed:0,pending:0,checkedIn:0,availableSeats:0,revenueCents:0,refunded:1};assert.deepEqual((await req('/api/organizer/events/'+e.id+'/dashboard',{cookie:A.cookie})).data,expected);
  emit({test:'immediate cancellation '+fastChannel,status:'PASS',elapsed:performance.now()-cancelledAt});scenarios.push({e,fast,slow,expected,cancelledAt});
 }
 await sleep(Math.max(...scenarios.map(s=>s.cancelledAt+45100-performance.now()),0));
 for(const s of scenarios){const fast=(await req('/api/partner/tickets/'+s.fast.ticketId,{partner:true})).data,slow=(await req('/api/partner/tickets/'+s.slow.ticketId,{partner:true})).data;assert.equal(fast.status,'refunded');assert.equal(fast.checkedIn,true);assert.equal(slow.status,'cancelled');assert.deepEqual((await req('/api/organizer/events/'+s.e.id+'/dashboard',{cookie:A.cookie})).data,s.expected);emit({test:'45s cancellation invariant',status:'PASS',elapsedAfterCancel:performance.now()-s.cancelledAt,fast,slow});}
}catch(e){emit({status:'FAIL',error:e.stack});process.exitCode=1;}finally{await new Promise(r=>app.close(r));db.close();emit({cleanup:'server and database closed'});}
