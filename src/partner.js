import { timingSafeEqual } from 'node:crypto';
import { body, HttpError, json } from './http.js';
import { listPublicEvents } from './events.js';
import { purchase, ticketResponse } from './purchases.js';

export async function partnerHandler({req,res,url,db}) {
  const listing = url.pathname === '/api/partner/events' && req.method === 'GET';
  const buying = req.method === 'POST' && url.pathname.match(/^\/api\/partner\/events\/([^/]+)\/purchases$/);
  const lookup = req.method === 'GET' && url.pathname.match(/^\/api\/partner\/tickets\/([^/]+)$/);
  if (!listing && !buying && !lookup) return false;
  const given = Buffer.from(req.headers['x-api-key'] || '');
  const expected = Buffer.from(process.env.PARTNER_API_KEY || 'catraca-partner-local');
  if (given.length !== expected.length || !timingSafeEqual(given,expected)) throw new HttpError(401,'unauthorized');
  if (listing) {
    json(res,200,listPublicEvents(db).map(e=>({id:e.id,name:e.name,startsAt:e.startsAt,priceCents:e.priceCents,availableSeats:e.availableSeats})));
  } else if (buying) {
    json(res,202,purchase(db,buying[1],await body(req)));
  } else {
    const ticket = db.prepare('SELECT * FROM tickets WHERE id=?').get(lookup[1]);
    if (!ticket) throw new HttpError(404,'ticket_not_found');
    json(res,200,ticketResponse(ticket));
  }
  return true;
}
