import { transaction } from './db.js';
import { ownedEvent } from './events.js';
import { requireUser } from './auth.js';
import { body, HttpError, json } from './http.js';

export function dashboard(db, eventId) {
  // One statement reads event capacity/status and tickets from the same snapshot.
  const metrics = db.prepare(`SELECT
    COUNT(CASE WHEN t.status='confirmed' THEN 1 END) AS confirmed,
    COUNT(CASE WHEN t.status='pending' THEN 1 END) AS pending,
    COUNT(CASE WHEN t.status='confirmed' AND t.checkedIn=1 THEN 1 END) AS checkedIn,
    CASE WHEN e.status='cancelled' THEN 0 ELSE e.capacity -
      COUNT(CASE WHEN t.status IN ('pending','confirmed') THEN 1 END) END AS availableSeats,
    COALESCE(SUM(CASE WHEN t.status='confirmed' THEN t.priceCents ELSE 0 END),0) AS revenueCents,
    COUNT(CASE WHEN t.status='refunded' THEN 1 END) AS refunded
    FROM events e LEFT JOIN tickets t ON t.eventId=e.id WHERE e.id=? GROUP BY e.id`).get(eventId);
  if (!metrics) throw new HttpError(404, 'event_not_found');
  return { ...metrics };
}

export function cancelEvent(db, organizerId, eventId) {
  return transaction(db, () => {
    const event = ownedEvent(db, organizerId, eventId);
    if (event.status === 'cancelled') throw new HttpError(409, 'event_cancelled');
    if (event.status !== 'published') throw new HttpError(409, 'event_not_published');
    db.prepare("UPDATE events SET status='cancelled' WHERE id=?").run(eventId);
    db.prepare(`UPDATE tickets SET status=CASE WHEN status='confirmed' THEN 'refunded' ELSE 'cancelled' END
      WHERE eventId=? AND status IN ('confirmed','pending')`).run(eventId);
    return ownedEvent(db, organizerId, eventId);
  });
}

export function checkIn(db, organizerId, eventId, code) {
  return transaction(db, () => {
    const event = ownedEvent(db, organizerId, eventId);
    const ticket = typeof code === 'string'
      ? db.prepare('SELECT * FROM tickets WHERE eventId=? AND code=?').get(eventId, code) : null;
    if (!ticket) return { message: 'Ingresso inválido para este evento' };
    if (event.status === 'cancelled') return { message: 'Evento cancelado' };
    if (ticket.status !== 'confirmed') return { message: 'Ingresso não confirmado' };
    if (ticket.checkedIn) return { message: 'Ingresso já utilizado' };
    db.prepare('UPDATE tickets SET checkedIn=1 WHERE id=?').run(ticket.id);
    return { message: 'Entrada liberada' };
  });
}

export async function operationsHandler({ req, res, url, db }) {
  const route = url.pathname.match(/^\/api\/organizer\/events\/([^/]+)\/(dashboard|cancel|check-in)$/);
  if (!route || req.method !== (route[2] === 'dashboard' ? 'GET' : 'POST')) return false;
  const user = requireUser(db, req, 'organizer');
  const eventId = route[1];
  // Authorize before reading the body or exposing metrics, including malformed requests.
  ownedEvent(db, user.id, eventId);
  if (route[2] === 'dashboard') json(res, 200, dashboard(db, eventId));
  else if (route[2] === 'cancel') json(res, 200, cancelEvent(db, user.id, eventId));
  else json(res, 200, checkIn(db, user.id, eventId, (await body(req)).code));
  return true;
}
