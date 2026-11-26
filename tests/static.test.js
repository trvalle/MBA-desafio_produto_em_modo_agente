import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { staticHandler } from '../src/static.js';

test('static routes support direct navigation and HEAD without exposing other files or API fallbacks', async t => {
  const server = createServer(async (req, res) => {
    if (!await staticHandler({ req, res, url: new URL(req.url, 'http://localhost') })) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end('{"error":"not_found"}');
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const path of ['/', '/login', '/register', '/tickets', '/organizer', '/organizer/events/evt_example-123']) {
    const response = await fetch(base + path);
    assert.equal(response.status, 200, path);
    assert.match(response.headers.get('content-type'), /^text\/html/);
    assert.match(await response.text(), /<html lang="pt-BR">/);
    assert.match(response.headers.get('content-security-policy'), /script-src 'self'/);
  }
  for (const [path, type] of [['/app.js', 'text/javascript'], ['/style.css', 'text/css']]) {
    const response = await fetch(base + path);
    assert.equal(response.status, 200);
    assert.ok(response.headers.get('content-type').startsWith(type));
    assert.ok((await response.text()).length > 0);
    const head = await fetch(base + path, { method: 'HEAD' });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), '');
    assert.equal(head.headers.get('content-length'), response.headers.get('content-length'));
  }
  for (const path of ['/api/missing', '/api/partner/missing', '/missing', '/package.json', '/src/db.js', '/docs/brief.md', '/%2e%2e/package.json', '/organizer/events/%2Fsecret', '/organizer/events/id/extra']) {
    const response = await fetch(base + path);
    assert.equal(response.status, 404, path);
    assert.match(response.headers.get('content-type'), /application\/json/);
  }
  assert.equal((await fetch(base + '/', { method: 'POST' })).status, 404);
});
