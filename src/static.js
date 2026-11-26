import { readFile } from 'node:fs/promises';

// Only these files and application routes are public; never join user paths to disk paths.
const files = new Map([
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/style.css', ['style.css', 'text/css; charset=utf-8']],
]);
const pages = new Set(['/', '/login', '/register', '/tickets', '/organizer']);
export async function staticHandler({ req, res, url }) {
  if (!['GET', 'HEAD'].includes(req.method)) return false;
  const path = url.pathname;
  const page = pages.has(path) || /^\/organizer\/events\/[A-Za-z0-9_-]+$/.test(path);
  const asset = files.get(path);
  if (!page && !asset) return false;
  const [filename, contentType] = page ? ['index.html', 'text/html; charset=utf-8'] : asset;
  const content = await readFile(new URL(`../public/${filename}`, import.meta.url));
  res.writeHead(200, {
    'Content-Type': contentType,
    'Content-Length': content.length,
    'Cache-Control': 'no-store',
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(req.method === 'HEAD' ? undefined : content);
  return true;
}
