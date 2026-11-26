import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { openDb } from '../src/db.js';
import {
  createEvent, updateEvent, publishEvent, ownedEvent,
  listPublicEvents, listOwnedEvents, eventsHandler,
} from '../src/events.js';
import { HttpError, json } from '../src/http.js';

function fixture(t) {
  const db = openDb(':memory:');
  t.after(() => db.close());
  const insert = db.prepare('INSERT INTO users (id,name,email,passwordHash,role) VALUES (?,?,?,?,?)');
  insert.run('org_a', 'A', 'a@example.com', 'unused', 'organizer');
  insert.run('org_b', 'B', 'b@example.com', 'unused', 'organizer');
  insert.run('participant', 'P', 'p@example.com', 'unused', 'participant');
  return db;
}
const input = (patch = {}) => ({
  name: 'Jazz', startsAt: new Date(Date.now() + 7 * 86400000).toISOString(),
  location: 'Porão', capacity: 5, priceCents: 12500, ...patch,
});
const error = (status, code) => err => err instanceof HttpError && err.status === status && err.error === code;
function ticket(db, eventId, status, { userId = null, checkedIn = 0, priceCents = 12500 } = {}) {
  const n = db.prepare('SELECT COUNT(*) n FROM tickets').get().n;
  db.prepare('INSERT INTO tickets (id,code,eventId,userId,buyerEmail,priceCents,status,checkedIn,createdAt,dueAt,approved) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
    .run('ticket_' + n, 'CODE_' + n, eventId, userId, 'buyer@example.com', priceCents, status, checkedIn, 1, 2, 1);
}

test('F03 create validates required values, future date and integer cents without partial writes', t => {
  const db = fixture(t);
  const invalid = [
    null, [], {}, input({ name: '' }), input({ name: '  ' }), input({ name: 42 }),
    input({ location: null }), input({ location: ' ' }), input({ startsAt: 'invalid' }),
    input({ startsAt: new Date(Date.now() - 86400000).toISOString() }), input({ startsAt: 9999999999999 }),
    input({ capacity: 0 }), input({ capacity: -1 }), input({ capacity: 1.5 }), input({ capacity: '5' }),
    input({ capacity: Infinity }), input({ capacity: Number.MAX_SAFE_INTEGER + 1 }),
    input({ priceCents: 0 }), input({ priceCents: -1 }), input({ priceCents: 0.5 }),
    input({ priceCents: '100' }), input({ priceCents: NaN }), input({ priceCents: Number.MAX_SAFE_INTEGER + 1 }),
  ];
  for (const field of ['name', 'startsAt', 'location', 'capacity', 'priceCents']) {
    const missing = input(); delete missing[field]; invalid.push(missing);
  }
  for (const value of invalid) {
    assert.throws(() => createEvent(db, 'org_a', value), error(422, 'invalid_request'));
    assert.equal(db.prepare('SELECT COUNT(*) n FROM events').get().n, 0);
  }
  const event = createEvent(db, 'org_a', input({ name: ' Jazz ', location: ' Porão ', status: 'published', organizerId: 'org_b' }));
  assert.equal(event.status, 'draft');
  assert.equal(event.organizerId, 'org_a');
  assert.equal(event.name, 'Jazz');
  assert.equal(event.location, 'Porão');
  assert.equal(event.priceCents, 12500);
  assert.equal(event.availableSeats, 5);
  assert.match(event.id, /^evt_/);
  assert.deepEqual(ownedEvent(db, 'org_a', event.id), event);
  assert.notEqual(createEvent(db, 'org_a', input()).id, event.id);
  assert.throws(() => createEvent(db, 'participant', input()), error(403, 'forbidden'));
  assert.throws(() => createEvent(db, 'missing', input()), error(403, 'forbidden'));
});

test('F03 update counts pending and confirmed across channels, preserves historical prices and rolls back rejection', t => {
  const db = fixture(t);
  const original = createEvent(db, 'org_a', input());
  ticket(db, original.id, 'pending');
  ticket(db, original.id, 'confirmed', { userId: 'participant', checkedIn: 1 });
  for (const status of ['declined', 'cancelled', 'refunded']) ticket(db, original.id, status);
  const before = ownedEvent(db, 'org_a', original.id);
  assert.equal(before.availableSeats, 3);
  assert.throws(() => updateEvent(db, 'org_a', original.id, input({ name: 'Changed', capacity: 1, priceCents: 500 })), error(409, 'capacity_below_occupied'));
  assert.deepEqual(ownedEvent(db, 'org_a', original.id), before);
  assert.equal(db.isTransaction, false);
  const exact = updateEvent(db, 'org_a', original.id, input({ capacity: 2 }));
  assert.equal(exact.availableSeats, 0);
  const expanded = updateEvent(db, 'org_a', original.id, input({ capacity: 8, priceCents: 20000 }));
  assert.equal(expanded.availableSeats, 6);
  assert.equal(expanded.priceCents, 20000);
  assert.ok(db.prepare('SELECT priceCents FROM tickets').all().every(row => row.priceCents === 12500));
});

test('F03 update revalidates all fields and future dates, ignoring attempted identity/status changes', t => {
  const db = fixture(t);
  const event = publishEvent(db, 'org_a', createEvent(db, 'org_a', input()).id);
  for (const patch of [{ startsAt: 'invalid' }, { startsAt: new Date(Date.now() - 86400000).toISOString() },
    { name: '' }, { location: '' }, { capacity: 0 }, { capacity: 1.2 }, { priceCents: 0 }, { priceCents: 12.5 }]) {
    assert.throws(() => updateEvent(db, 'org_a', event.id, input(patch)), error(422, 'invalid_request'));
    assert.deepEqual(ownedEvent(db, 'org_a', event.id), event);
  }
  const edited = updateEvent(db, 'org_a', event.id, input({ name: 'Novo', id: 'forged', organizerId: 'org_b', status: 'cancelled' }));
  assert.equal(edited.id, event.id);
  assert.equal(edited.organizerId, 'org_a');
  assert.equal(edited.status, 'published');
  assert.equal(edited.name, 'Novo');
  db.prepare('UPDATE events SET startsAt=? WHERE id=?').run('2000-01-01T00:00:00Z', event.id);
  assert.throws(() => updateEvent(db, 'org_a', event.id, { ...ownedEvent(db, 'org_a', event.id), name: 'Again' }), error(422, 'invalid_request'));
  assert.equal(updateEvent(db, 'org_a', event.id, input()).name, 'Jazz');
});

test('F03 ownership applies to list, direct URL domain lookup, edit and publish', t => {
  const db = fixture(t);
  const a = createEvent(db, 'org_a', input({ name: 'Private A' }));
  const b = createEvent(db, 'org_b', input({ name: 'Private B' }));
  assert.deepEqual(listOwnedEvents(db, 'org_a').map(e => e.id), [a.id]);
  assert.deepEqual(listOwnedEvents(db, 'org_b').map(e => e.id), [b.id]);
  assert.deepEqual(listOwnedEvents(db, 'participant'), []);
  for (const wrongId of ['org_b', 'participant', 'missing']) {
    assert.throws(() => ownedEvent(db, wrongId, a.id), error(404, 'event_not_found'));
    assert.throws(() => updateEvent(db, wrongId, a.id, input()), error(404, 'event_not_found'));
    assert.throws(() => publishEvent(db, wrongId, a.id), error(404, 'event_not_found'));
  }
  assert.throws(() => ownedEvent(db, 'org_a', 'missing'), error(404, 'event_not_found'));
  assert.deepEqual(ownedEvent(db, 'org_a', a.id), a);
});

test('F03 public catalog follows publication and cancellation, preserving sold out events', t => {
  const db = fixture(t);
  const draft = createEvent(db, 'org_a', input());
  const soldOut = createEvent(db, 'org_b', input({ capacity: 1, priceCents: 899 }));
  assert.deepEqual(listPublicEvents(db), []);
  publishEvent(db, 'org_a', draft.id);
  publishEvent(db, 'org_b', soldOut.id);
  ticket(db, soldOut.id, 'pending');
  const catalog = listPublicEvents(db);
  assert.equal(catalog.length, 2);
  assert.equal(catalog.find(e => e.id === draft.id).availableSeats, 5);
  assert.equal(catalog.find(e => e.id === soldOut.id).availableSeats, 0);
  assert.equal(catalog.find(e => e.id === soldOut.id).priceCents, 899);
  assert.equal(publishEvent(db, 'org_a', draft.id).status, 'published');
  db.prepare("UPDATE events SET status='cancelled' WHERE id=?").run(draft.id);
  assert.deepEqual(listPublicEvents(db).map(e => e.id), [soldOut.id]);
  const cancelled = ownedEvent(db, 'org_a', draft.id);
  assert.equal(cancelled.availableSeats, 0);
  assert.throws(() => updateEvent(db, 'org_a', draft.id, input()), error(409, 'event_cancelled'));
  assert.throws(() => publishEvent(db, 'org_a', draft.id), error(409, 'event_cancelled'));
  assert.deepEqual(ownedEvent(db, 'org_a', draft.id), cancelled);
});

test('F03 public HTTP adapter works without auth dependency and ignores unrelated routes', async t => {
  const db = fixture(t);
  const event = publishEvent(db, 'org_a', createEvent(db, 'org_a', input()).id);
  const app = createServer(async (req, res) => {
    try {
      if (!await eventsHandler({ req, res, db, url: new URL(req.url, 'http://localhost') })) json(res, 404, { error: 'not_found' });
    } catch (err) { json(res, err.status || 500, { error: err.error || 'internal_error' }); }
  });
  await new Promise(resolve => app.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => app.close(resolve)));
  const base = 'http://127.0.0.1:' + app.address().port;
  const response = await fetch(base + '/api/events');
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), [event]);
  assert.equal((await fetch(base + '/api/unrelated')).status, 404);
});
