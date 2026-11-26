import { createServer } from 'node:http';
import { openDb } from './db.js';
import { seed } from './seed.js';
import { json, HttpError } from './http.js';
import { pathToFileURL } from 'node:url';
import { authHandler } from './auth.js';
import { eventsHandler } from './events.js';
import { purchasesHandler, processPayments } from './purchases.js';
import { partnerHandler } from './partner.js';
import { operationsHandler } from './operations.js';
export function createApp({ db = openDb(), handlers = [partnerHandler, authHandler, eventsHandler, purchasesHandler, operationsHandler] } = {}) {
  seed(db);
  const server = createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'same-origin');
    try {
      const url = new URL(req.url, 'http://localhost');
      if (!url.pathname.startsWith('/api/partner/') && !['GET','HEAD','OPTIONS'].includes(req.method) && req.headers.origin) {
        if (new URL(req.headers.origin).host !== req.headers.host) throw new HttpError(403, 'forbidden_origin');
      }
      if (url.pathname === '/api/health') return json(res, 200, { status: 'ok' });
      const ctx = { req, res, url, db };
      for (const handler of handlers) if (await handler(ctx)) return;
      json(res, 404, { error: 'not_found' });
    } catch (error) {
      if (!error.status) console.error(error);
      if (!res.headersSent) json(res, error.status || 500, { error: error.error || 'internal_error' });
      else res.end();
    }
  });
  const timer = setInterval(() => { try { processPayments(db); } catch (error) { console.error('Payment worker:',error.message); } },100);
  timer.unref(); server.on('close',()=>clearInterval(timer));
  return server;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const db = openDb(); const server = createApp({ db });
  server.listen(Number(process.env.PORT || 3000), '0.0.0.0', () => console.log('Catraca pronta na porta ' + (process.env.PORT || 3000)));
  const stop = () => server.close(() => { db.close(); process.exit(0); });
  process.on('SIGTERM', stop); process.on('SIGINT', stop);
}
