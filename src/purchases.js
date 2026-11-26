import { randomBytes } from 'node:crypto';
import { available, transaction } from './db.js';
import { id, validEmail } from './security.js';
import { body, HttpError, json } from './http.js';
import { requireUser } from './auth.js';

export function purchase(db, eventId, input, userId = null, options = {}) {
  if (!input || !validEmail(input.buyerEmail) || typeof input.cardNumber !== 'string'
    || !/^\d{16}$/.test(input.cardNumber)) throw new HttpError(422, 'invalid_request');
  return transaction(db, () => {
    const event = db.prepare('SELECT * FROM events WHERE id=?').get(eventId);
    if (!event || event.status !== 'published') throw new HttpError(404, 'event_not_available');
    if (available(db, event) <= 0) throw new HttpError(409, 'sold_out');
    const suffix = input.cardNumber.slice(-4);
    const delay = ['0003','0004'].includes(suffix) ? (options.slowDelayMs ?? 35000) : (options.fastDelayMs ?? 3000);
    const ticketId = id('tkt'); const code = randomBytes(8).toString('hex').toUpperCase();
    const now = Date.now();
    db.prepare(`INSERT INTO tickets(id,code,eventId,userId,buyerEmail,priceCents,status,checkedIn,createdAt,dueAt,approved)
      VALUES(?,?,?,?,?,?,'pending',0,?,?,?)`).run(ticketId,code,eventId,userId,input.buyerEmail,event.priceCents,
      now,now + delay,['0001','0003'].includes(suffix) ? 1 : 0);
    return { ticketId, code, status: 'pending' };
  });
}

export function processPayments(db, now = Date.now()) {
  return transaction(db, () => db.prepare(`UPDATE tickets SET status=CASE WHEN approved=1 THEN 'confirmed' ELSE 'declined' END
    WHERE status='pending' AND dueAt<=? AND EXISTS
      (SELECT 1 FROM events WHERE events.id=tickets.eventId AND events.status='published')`).run(now).changes);
}

export function ticketResponse(ticket) {
  return { ticketId:ticket.id, code:ticket.code, eventId:ticket.eventId, status:ticket.status, checkedIn:Boolean(ticket.checkedIn) };
}

export async function purchasesHandler({req,res,url,db}) {
  const match = url.pathname.match(/^\/api\/events\/([^/]+)\/purchases$/);
  if (match && req.method === 'POST') {
    const user = requireUser(db,req,'participant');
    const input = await body(req);
    json(res,202,purchase(db,match[1],{buyerEmail:user.email,cardNumber:input.cardNumber},user.id)); return true;
  }
  if (url.pathname === '/api/tickets' && req.method === 'GET') {
    const user = requireUser(db,req,'participant');
    const tickets = db.prepare(`SELECT t.*,e.name AS eventName,e.startsAt,e.location FROM tickets t
      JOIN events e ON e.id=t.eventId WHERE t.userId=? ORDER BY t.createdAt DESC,t.id`).all(user.id);
    json(res,200,tickets.map(t=>({...ticketResponse(t),eventName:t.eventName,startsAt:t.startsAt,location:t.location,priceCents:t.priceCents}))); return true;
  }
  return false;
}
