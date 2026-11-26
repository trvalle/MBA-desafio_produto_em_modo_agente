import { available, occupied, transaction } from './db.js';
import { body, HttpError, json } from './http.js';
import { id } from './security.js';

function eventInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      typeof input.name !== 'string' || !input.name.trim() ||
      typeof input.location !== 'string' || !input.location.trim() ||
      typeof input.startsAt !== 'string' || !Number.isFinite(Date.parse(input.startsAt)) ||
      Date.parse(input.startsAt) <= Date.now() ||
      !Number.isSafeInteger(input.capacity) || input.capacity < 1 ||
      !Number.isSafeInteger(input.priceCents) || input.priceCents < 1) {
    throw new HttpError(422, 'invalid_request');
  }
  return { name: input.name.trim(), startsAt: input.startsAt, location: input.location.trim(),
    capacity: input.capacity, priceCents: input.priceCents };
}

function withAvailability(db, event) {
  return { ...event, availableSeats: available(db, event) };
}

export function ownedEvent(db, organizerId, eventId) {
  const event = db.prepare('SELECT * FROM events WHERE id=? AND organizerId=?').get(eventId, organizerId);
  if (!event) throw new HttpError(404, 'event_not_found');
  return withAvailability(db, event);
}

export function createEvent(db, organizerId, input) {
  const data = eventInput(input);
  const organizer = db.prepare('SELECT role FROM users WHERE id=?').get(organizerId);
  if (organizer?.role !== 'organizer') throw new HttpError(403, 'forbidden');
  const eventId = id('evt');
  db.prepare('INSERT INTO events (id,organizerId,name,startsAt,location,capacity,priceCents,status) VALUES (?,?,?,?,?,?,?,?)')
    .run(eventId, organizerId, data.name, data.startsAt, data.location, data.capacity, data.priceCents, 'draft');
  return ownedEvent(db, organizerId, eventId);
}

export function updateEvent(db, organizerId, eventId, input) {
  return transaction(db, () => {
    const event = ownedEvent(db, organizerId, eventId);
    if (event.status === 'cancelled') throw new HttpError(409, 'event_cancelled');
    const data = eventInput(input);
    if (data.capacity < occupied(db, eventId)) throw new HttpError(409, 'capacity_below_occupied');
    db.prepare('UPDATE events SET name=?, startsAt=?, location=?, capacity=?, priceCents=? WHERE id=?')
      .run(data.name, data.startsAt, data.location, data.capacity, data.priceCents, eventId);
    return ownedEvent(db, organizerId, eventId);
  });
}

export function publishEvent(db, organizerId, eventId) {
  return transaction(db, () => {
    const event = ownedEvent(db, organizerId, eventId);
    if (event.status === 'cancelled') throw new HttpError(409, 'event_cancelled');
    db.prepare("UPDATE events SET status='published' WHERE id=?").run(eventId);
    return ownedEvent(db, organizerId, eventId);
  });
}

export function listPublicEvents(db) {
  return db.prepare("SELECT * FROM events WHERE status='published' ORDER BY startsAt,id").all()
    .map(event => withAvailability(db, event));
}

export function listOwnedEvents(db, organizerId) {
  return db.prepare('SELECT * FROM events WHERE organizerId=? ORDER BY startsAt,id').all(organizerId)
    .map(event => withAvailability(db, event));
}

export async function eventsHandler({ req, res, url, db }) {
  const path = url.pathname;
  if (path === '/api/events' && req.method === 'GET') {
    json(res, 200, listPublicEvents(db));
    return true;
  }
  const collection = path === '/api/organizer/events';
  const detail = path.match(/^\/api\/organizer\/events\/([^/]+)$/);
  const publication = path.match(/^\/api\/organizer\/events\/([^/]+)\/publish$/);
  const handled = (collection && ['GET', 'POST'].includes(req.method)) ||
    (detail && ['GET', 'PUT'].includes(req.method)) || (publication && req.method === 'POST');
  if (!handled) return false;
  // The domain remains independent while F02 and F03 are developed in parallel.
  const { requireUser } = await import('./auth.js');
  const user = requireUser(db, req, 'organizer');
  if (collection) {
    if (req.method === 'GET') json(res, 200, listOwnedEvents(db, user.id));
    else json(res, 201, createEvent(db, user.id, await body(req)));
  } else if (detail) {
    if (req.method === 'GET') json(res, 200, ownedEvent(db, user.id, detail[1]));
    else json(res, 200, updateEvent(db, user.id, detail[1], await body(req)));
  } else json(res, 200, publishEvent(db, user.id, publication[1]));
  return true;
}
