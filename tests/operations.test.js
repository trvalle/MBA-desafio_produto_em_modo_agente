import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Worker } from 'node:worker_threads';
import { openDb } from '../src/db.js';
import { seed } from '../src/seed.js';
import { createApp } from '../src/server.js';
import { authHandler } from '../src/auth.js';
import { createEvent, publishEvent, updateEvent, ownedEvent, eventsHandler } from '../src/events.js';
import { purchase, processPayments, purchasesHandler } from '../src/purchases.js';
import { partnerHandler } from '../src/partner.js';
import { cancelEvent, checkIn, dashboard, operationsHandler } from '../src/operations.js';

const input = { name: 'Operações', startsAt: '2099-05-05T18:00:00Z', location: 'Local', capacity: 3, priceCents: 10000 };
const buyer = suffix => ({ buyerEmail: 'participante@catraca.local', cardNumber: `400000000000${suffix}` });
function event(db, overrides = {}) {
  const draft = createEvent(db, 'org_a', { ...input, ...overrides });
  return publishEvent(db, 'org_a', draft.id);
}
function database(t) {
  const db = openDb(':memory:');
  seed(db);
  t.after(() => db.close());
  return db;
}
async function fixture(t) {
  const db = openDb(':memory:');
  const server = createApp({ db, handlers: [authHandler, eventsHandler, purchasesHandler, partnerHandler, operationsHandler] });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); db.close(); });
  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(path, { method = 'GET', data, cookie, partner = false, raw } = {}) {
    const response = await fetch(base + path, {
      method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}),
        ...(partner ? { 'X-Api-Key': 'catraca-partner-local' } : {}) },
      body: raw ?? (data === undefined ? undefined : JSON.stringify(data))
    });
    return { status: response.status, data: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] };
  }
  async function login(email) {
    const response = await request('/api/auth/login', { method: 'POST', data: { email, password: 'Catraca123!' } });
    assert.equal(response.status, 200);
    return response.cookie;
  }
  return { db, request, login };
}

test('F05 painel E1 integra HTTP dos dois canais com preços históricos e entrada única', async t => {
  const { db, request, login } = await fixture(t);
  const organizer = await login('organizador.a@catraca.local');
  const participant = await login('participante@catraca.local');
  const e = event(db);
  const base = `/api/organizer/events/${e.id}`;
  const buySite = () => request(`/api/events/${e.id}/purchases`, {
    method: 'POST', cookie: participant, data: { cardNumber: buyer('0001').cardNumber }
  });
  const first = await buySite();
  const second = await request(`/api/partner/events/${e.id}/purchases`, { method: 'POST', partner: true, data: buyer('0001') });
  assert.equal(first.status, 202); assert.equal(second.status, 202);
  updateEvent(db, 'org_a', e.id, { ...input, priceCents: 15000 });
  assert.equal((await buySite()).status, 202);
  processPayments(db, Date.now() + 5000);
  const expected = { confirmed: 3, pending: 0, checkedIn: 0, availableSeats: 0, revenueCents: 35000, refunded: 0 };
  const before = await request(`${base}/dashboard`, { cookie: organizer });
  assert.equal(before.status, 200); assert.deepEqual(before.data, expected);
  const responses = await Promise.all(Array.from({ length: 12 }, () => request(`${base}/check-in`, {
    method: 'POST', cookie: organizer, data: { code: second.data.code }
  })));
  assert.ok(responses.every(r => r.status === 200));
  assert.equal(responses.filter(r => r.data.message === 'Entrada liberada').length, 1);
  assert.equal(responses.filter(r => r.data.message === 'Ingresso já utilizado').length, 11);
  assert.deepEqual((await request(`${base}/dashboard`, { cookie: organizer })).data, { ...expected, checkedIn: 1 });
  assert.deepEqual((await request(`/api/partner/tickets/${second.data.ticketId}`, { partner: true })).data,
    { ...second.data, eventId: e.id, status: 'confirmed', checkedIn: true });
  const cancelled = await request(`${base}/cancel`, { method: 'POST', cookie: organizer });
  assert.equal(cancelled.status, 200); assert.equal(cancelled.data.status, 'cancelled');
  assert.deepEqual((await request(`${base}/dashboard`, { cookie: organizer })).data,
    { confirmed: 0, pending: 0, checkedIn: 0, availableSeats: 0, revenueCents: 0, refunded: 3 });
});

test('F05 cancelamento E3 é imediato, irreversível e preservado por callback lento dos dois canais', async t => {
  const { db, request, login } = await fixture(t);
  const organizer = await login('organizador.a@catraca.local');
  const participant = await login('participante@catraca.local');
  const e = event(db);
  const fast = await request(`/api/events/${e.id}/purchases`, {
    method: 'POST', cookie: participant, data: { cardNumber: buyer('0001').cardNumber }
  });
  const slow = await request(`/api/partner/events/${e.id}/purchases`, { method: 'POST', partner: true, data: buyer('0003') });
  assert.equal(fast.status, 202); assert.equal(slow.status, 202);
  processPayments(db, Date.now() + 5000);
  assert.deepEqual(dashboard(db, e.id), { confirmed: 1, pending: 1, checkedIn: 0, availableSeats: 1, revenueCents: 10000, refunded: 0 });
  assert.equal(checkIn(db, 'org_a', e.id, fast.data.code).message, 'Entrada liberada');
  const start = performance.now();
  assert.equal((await request(`/api/organizer/events/${e.id}/cancel`, { method: 'POST', cookie: organizer })).status, 200);
  assert.ok(performance.now() - start < 10000);
  const verify = async () => {
    for (const [ticket, status, checkedIn] of [[fast, 'refunded', true], [slow, 'cancelled', false]]) {
      assert.deepEqual((await request(`/api/partner/tickets/${ticket.data.ticketId}`, { partner: true })).data,
        { ...ticket.data, eventId: e.id, status, checkedIn });
    }
    assert.deepEqual(dashboard(db, e.id), { confirmed: 0, pending: 0, checkedIn: 0, availableSeats: 0, revenueCents: 0, refunded: 1 });
  };
  await verify();
  assert.equal(processPayments(db, Date.now() + 45000), 0);
  await verify();
  for (const path of ['/api/events', '/api/partner/events']) {
    assert.ok(!(await request(path, { partner: true })).data.some(item => item.id === e.id));
  }
  const rejected = await request(`/api/partner/events/${e.id}/purchases`, { method: 'POST', partner: true, data: buyer('0001') });
  assert.equal(rejected.status, 404); assert.deepEqual(rejected.data, { error: 'event_not_available' });
  for (const action of [
    () => updateEvent(db, 'org_a', e.id, input), () => publishEvent(db, 'org_a', e.id), () => cancelEvent(db, 'org_a', e.id)
  ]) assert.throws(action, { status: 409, error: 'event_cancelled' });
});

test('F05 check-in segue todas as mensagens literais e a prioridade R10', t => {
  const db = database(t);
  const e = event(db, { capacity: 4 });
  const other = event(db);
  const confirmed = purchase(db, e.id, buyer('0001'));
  const declined = purchase(db, e.id, buyer('0002'));
  const pending = purchase(db, e.id, buyer('0003'));
  const foreign = purchase(db, other.id, buyer('0001'));
  processPayments(db, Date.now() + 5000);
  for (const code of ['absent', foreign.code, undefined, null, {}, 1]) {
    assert.deepEqual(checkIn(db, 'org_a', e.id, code), { message: 'Ingresso inválido para este evento' });
  }
  for (const ticket of [declined, pending]) {
    assert.equal(checkIn(db, 'org_a', e.id, ticket.code).message, 'Ingresso não confirmado');
  }
  assert.equal(checkIn(db, 'org_a', e.id, confirmed.code).message, 'Entrada liberada');
  assert.equal(checkIn(db, 'org_a', e.id, confirmed.code).message, 'Ingresso já utilizado');
  cancelEvent(db, 'org_a', e.id);
  for (const code of ['absent', foreign.code]) {
    assert.equal(checkIn(db, 'org_a', e.id, code).message, 'Ingresso inválido para este evento');
  }
  for (const ticket of [confirmed, declined, pending]) {
    assert.equal(checkIn(db, 'org_a', e.id, ticket.code).message, 'Evento cancelado');
  }
  assert.equal(db.prepare('SELECT status FROM tickets WHERE id=?').get(declined.ticketId).status, 'declined');
});

test('F05/CF06 todas as rotas protegem dados e mutações por papel e propriedade antes do corpo', async t => {
  const { db, request, login } = await fixture(t);
  const e = event(db);
  const ticket = purchase(db, e.id, buyer('0001'), null, { fastDelayMs: 0 });
  processPayments(db);
  const participant = await login('participante@catraca.local');
  const other = await login('organizador.b@catraca.local');
  for (const [cookie, status, error] of [[undefined, 401, 'unauthorized'], [participant, 403, 'forbidden'], [other, 404, 'event_not_found']]) {
    for (const action of ['dashboard', 'cancel', 'check-in']) {
      const method = action === 'dashboard' ? 'GET' : 'POST';
      for (const raw of method === 'GET' ? [undefined] : ['{', JSON.stringify({ code: ticket.code })]) {
        const response = await request(`/api/organizer/events/${e.id}/${action}`, { method, cookie, raw });
        assert.equal(response.status, status); assert.deepEqual(response.data, { error });
      }
    }
  }
  assert.equal(ownedEvent(db, 'org_a', e.id).status, 'published');
  assert.deepEqual(dashboard(db, e.id), { confirmed: 1, pending: 0, checkedIn: 0, availableSeats: 2, revenueCents: 10000, refunded: 0 });
  for (const action of [() => cancelEvent(db, 'org_b', e.id), () => checkIn(db, 'org_b', e.id, ticket.code)]) {
    assert.throws(action, { status: 404, error: 'event_not_found' });
  }
  const owner = await login('organizador.a@catraca.local');
  for (const action of ['dashboard', 'cancel', 'check-in']) {
    assert.equal((await request(`/api/organizer/events/missing/${action}`, {
      method: action === 'dashboard' ? 'GET' : 'POST', cookie: owner, data: action === 'check-in' ? { code: ticket.code } : undefined
    })).status, 404);
  }
  assert.equal((await request(`/api/organizer/events/${e.id}/check-in`, { method: 'POST', cookie: owner, raw: '{' })).status, 422);
  assert.equal((await request(`/api/organizer/events/${e.id}/check-in`, { method: 'POST', cookie: owner, data: {} })).data.message, 'Ingresso inválido para este evento');
  assert.equal((await request(`/api/organizer/events/${e.id}/cancel`, { cookie: owner })).status, 404);
});

test('F05 cancelamento rejeita draft e reverte todas as mudanças se a transação falhar', t => {
  const db = database(t);
  const draft = createEvent(db, 'org_a', input);
  assert.throws(() => cancelEvent(db, 'org_a', draft.id), { status: 409, error: 'event_not_published' });
  assert.equal(ownedEvent(db, 'org_a', draft.id).status, 'draft');
  assert.deepEqual(dashboard(db, draft.id), { confirmed: 0, pending: 0, checkedIn: 0, availableSeats: 3, revenueCents: 0, refunded: 0 });
  assert.throws(() => dashboard(db, 'missing'), { status: 404 });
  const e = event(db);
  const confirmed = purchase(db, e.id, buyer('0001'), null, { fastDelayMs: 0 });
  processPayments(db);
  const pending = purchase(db, e.id, buyer('0003'));
  db.exec("CREATE TRIGGER fail_refund BEFORE UPDATE OF status ON tickets BEGIN SELECT RAISE(ABORT, 'test failure'); END");
  assert.throws(() => cancelEvent(db, 'org_a', e.id), /test failure/);
  assert.equal(ownedEvent(db, 'org_a', e.id).status, 'published');
  for (const [ticket, status] of [[confirmed, 'confirmed'], [pending, 'pending']]) {
    assert.equal(db.prepare('SELECT status FROM tickets WHERE id=?').get(ticket.ticketId).status, status);
  }
});

test('F05 BEGIN IMMEDIATE concede apenas uma entrada entre conexões SQLite independentes', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'catraca-checkin-'));
  const path = join(dir, 'db.sqlite');
  const db = openDb(path);
  seed(db);
  const e = event(db);
  const ticket = purchase(db, e.id, buyer('0001'), null, { fastDelayMs: 0 });
  processPayments(db);
  try {
    const responses = await Promise.all(Array.from({ length: 10 }, () => new Promise((resolve, reject) => {
      const worker = new Worker(`
        const { parentPort, workerData } = require('node:worker_threads');
        (async () => {
          const { openDb } = await import(workerData.dbModule);
          const { checkIn } = await import(workerData.operationsModule);
          const connection = openDb(workerData.path);
          try { parentPort.postMessage(checkIn(connection, 'org_a', workerData.eventId, workerData.code)); }
          finally { connection.close(); }
        })().catch(error => { throw error; });
      `, { eval: true, workerData: { path, eventId: e.id, code: ticket.code,
        dbModule: new URL('../src/db.js', import.meta.url).href,
        operationsModule: new URL('../src/operations.js', import.meta.url).href } });
      let result;
      worker.once('message', value => { result = value; });
      worker.once('error', reject);
      worker.once('exit', code => code === 0 ? resolve(result) : reject(new Error(`Worker exit ${code}`)));
    })));
    assert.equal(responses.filter(r => r.message === 'Entrada liberada').length, 1);
    assert.equal(responses.filter(r => r.message === 'Ingresso já utilizado').length, 9);
    assert.deepEqual({ ...db.prepare('SELECT status,checkedIn FROM tickets WHERE id=?').get(ticket.ticketId) },
      { status: 'confirmed', checkedIn: 1 });
  } finally { db.close(); rmSync(dir, { recursive: true, force: true }); }
});
