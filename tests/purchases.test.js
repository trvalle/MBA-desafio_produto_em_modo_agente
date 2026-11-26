import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Worker } from 'node:worker_threads';
import { openDb, occupied } from '../src/db.js';
import { seed } from '../src/seed.js';
import { createEvent, publishEvent, updateEvent } from '../src/events.js';
import { purchase, processPayments } from '../src/purchases.js';
import { createApp } from '../src/server.js';

const input = {name:'Evento teste',startsAt:'2099-05-05T18:00:00Z',location:'Local',capacity:5,priceCents:10000};
const buyer = suffix=>({buyerEmail:'comprador@example.com',cardNumber:`400000000000${suffix}`});
const event = (db, capacity=5) => { const e = createEvent(db,'org_a',{...input,capacity}); return publishEvent(db,'org_a',e.id); };
test('F04 wall-clock jumps cannot accelerate or stall gateway elapsed time',async()=>{
  const db=openDb(':memory:');seed(db);const e=event(db);
  const ticket=purchase(db,e.id,buyer('0001'),null,{fastDelayMs:150});
  const original=Date.now; const baseline=Date.now();
  try {
    Date.now=()=>baseline+3600000;
    processPayments(db);
    assert.equal(db.prepare('SELECT status FROM tickets WHERE id=?').get(ticket.ticketId).status,'pending');
    Date.now=()=>baseline-3600000;
    await new Promise(r=>setTimeout(r,180));processPayments(db);
    assert.equal(db.prepare('SELECT status FROM tickets WHERE id=?').get(ticket.ticketId).status,'confirmed');
  }finally{Date.now=original;db.close();}
});
test('F04 preço histórico, validação antes do evento, reservas, recusa e callback idempotente',()=>{
  const db=openDb(':memory:');seed(db);const e=event(db,2);
  assert.throws(()=>purchase(db,'missing',{buyerEmail:'x',cardNumber:'123'}),e=>e.status===422);
  assert.throws(()=>purchase(db,'missing',buyer('0001')),e=>e.status===404);
  const t1=purchase(db,e.id,buyer('0001'),null,{fastDelayMs:0});
  updateEvent(db,'org_a',e.id,{...input,capacity:2,priceCents:15000});
  const t2=purchase(db,e.id,buyer('0002'),null,{fastDelayMs:0});
  assert.equal(occupied(db,e.id),2);assert.throws(()=>purchase(db,e.id,buyer('0001')),e=>e.status===409);
  assert.equal(processPayments(db),2); assert.equal(processPayments(db),0);
  assert.equal(occupied(db,e.id),1);
  assert.equal(db.prepare('SELECT priceCents FROM tickets WHERE id=?').get(t1.ticketId).priceCents,10000);
  assert.equal(db.prepare('SELECT priceCents FROM tickets WHERE id=?').get(t2.ticketId).priceCents,15000);
  assert.equal(db.prepare('SELECT status FROM tickets WHERE id=?').get(t2.ticketId).status,'declined');
  db.close();
});
test('F04 gateway defaults and persisted jobs survive reopen; final states cannot resurrect',()=>{
  const dir=mkdtempSync(join(tmpdir(),'catraca-jobs-')); const path=join(dir,'db.sqlite');
  let db=openDb(path);seed(db);const e=event(db,8);
  const tickets=['0001','0002','0003','0004','9999'].map(s=>purchase(db,e.id,buyer(s)));
  const rows=db.prepare('SELECT * FROM tickets ORDER BY createdAt,id').all();
  for(const row of rows) assert.ok([3000,35000].includes(row.dueAt-row.createdAt));
  db.close();db=openDb(path);processPayments(db,Date.now()+40000);
  assert.deepEqual(tickets.map(t=>db.prepare('SELECT status FROM tickets WHERE id=?').get(t.ticketId).status),['confirmed','declined','confirmed','declined','declined']);
  db.prepare("UPDATE tickets SET status='refunded' WHERE id=?").run(tickets[0].ticketId);
  db.prepare("UPDATE tickets SET status='cancelled' WHERE id=?").run(tickets[2].ticketId);
  processPayments(db,Date.now()+80000);
  assert.equal(db.prepare('SELECT status FROM tickets WHERE id=?').get(tickets[2].ticketId).status,'cancelled');
  assert.equal(db.prepare('SELECT status FROM tickets WHERE id=?').get(tickets[0].ticketId).status,'refunded');
  db.close();rmSync(dir,{recursive:true,force:true});
});
test('F04 HTTP contract, precedence, channels and repeated 30-request races',async()=>{
  const db=openDb(':memory:');const server=createApp({db});await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base=`http://127.0.0.1:${server.address().port}`;
  const call=async(path,method='GET',data,key='catraca-partner-local',cookie)=>{
    const headers={'Content-Type':'application/json'};if(key!==null)headers['X-Api-Key']=key;if(cookie)headers.Cookie=cookie;
    const res=await fetch(base+path,{method,headers,body:data===undefined?undefined:JSON.stringify(data)});
    return {status:res.status,data:await res.json(),cookie:res.headers.get('set-cookie')?.split(';')[0]};
  };
  try {
    for(const key of [null,'wrong']) for(const [path,method,data] of [
      ['/api/partner/events','GET'],['/api/partner/events/missing/purchases','POST',{}],['/api/partner/tickets/missing','GET']
    ]) assert.deepEqual((await call(path,method,data,key)).data,{error:'unauthorized'});
    assert.equal((await call('/api/partner/events/missing/purchases','POST',{})).status,422);
    assert.equal((await call('/api/partner/events/missing/purchases','POST',buyer('0001'))).status,404);
    assert.deepEqual((await call('/api/partner/tickets/missing')).data,{error:'ticket_not_found'});
    const draft=createEvent(db,'org_a',input);
    assert.equal((await call(`/api/partner/events/${draft.id}/purchases`,'POST',buyer('0001'))).status,404);
    for(let round=0;round<5;round++) {
      const e=event(db);const responses=await Promise.all(Array.from({length:30},()=>call(`/api/partner/events/${e.id}/purchases`,'POST',buyer('0001'))));
      assert.equal(responses.filter(r=>r.status===202).length,5);assert.equal(responses.filter(r=>r.status===409).length,25);assert.equal(occupied(db,e.id),5);
    }
    const e=event(db); const login=await call('/api/auth/login','POST',{email:'participante@catraca.local',password:'Catraca123!'});
    assert.equal((await call(`/api/events/${e.id}/purchases`,'POST',{cardNumber:buyer('0001').cardNumber})).status,401);
    const ui=await call(`/api/events/${e.id}/purchases`,'POST',{cardNumber:buyer('0001').cardNumber},null,login.cookie);
    assert.equal(ui.status,202);assert.deepEqual(Object.keys(ui.data).sort(),['code','status','ticketId']);
    await call(`/api/partner/events/${e.id}/purchases`,'POST',{...buyer('0001'),buyerEmail:'participante@catraca.local'});
    const mine=await call('/api/tickets','GET',undefined,null,login.cookie);assert.equal(mine.data.length,1);assert.equal(mine.data[0].ticketId,ui.data.ticketId);
    const lookup=await call(`/api/partner/tickets/${ui.data.ticketId}`);assert.equal(lookup.data.checkedIn,false);
    assert.deepEqual(Object.keys(lookup.data).sort(),['checkedIn','code','eventId','status','ticketId']);
    const listing=await call('/api/partner/events');assert.deepEqual(Object.keys(listing.data[0]).sort(),['availableSeats','id','name','priceCents','startsAt']);
  } finally {await new Promise(r=>server.close(r));db.close();}
});
test('F04 database lock protects reservations across independent worker connections',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'catraca-lock-'));const path=join(dir,'db.sqlite');const db=openDb(path);seed(db);const e=event(db);
  try {
    const responses=await Promise.all(Array.from({length:10},()=>new Promise((resolve,reject)=>{
      const worker=new Worker(new URL('./workers/purchase-worker.js',import.meta.url),{workerData:{path,eventId:e.id}});
      worker.once('message',resolve);worker.once('error',reject);
    })));
    assert.equal(responses.filter(s=>s===202).length,5);assert.equal(responses.filter(s=>s===409).length,5);assert.equal(occupied(db,e.id),5);
  } finally {db.close();rmSync(dir,{recursive:true,force:true});}
});
