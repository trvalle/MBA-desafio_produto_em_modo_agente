import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb, transaction } from '../src/db.js';
import { seed } from '../src/seed.js';
import { verifyPassword } from '../src/security.js';
import { createApp } from '../src/server.js';
test('F01 seed idempotente, credenciais e rollback real', () => {
  const db = openDb(':memory:'); seed(db); seed(db);
  assert.equal(db.prepare('SELECT count(*) n FROM users').get().n, 3);
  assert.equal(db.prepare("SELECT count(*) n FROM users WHERE role='organizer'").get().n, 2);
  assert.ok(verifyPassword('Catraca123!', db.prepare("SELECT passwordHash FROM users WHERE id='org_a'").get().passwordHash));
  assert.throws(() => transaction(db, () => { db.prepare("DELETE FROM users WHERE id='org_b'").run(); throw Error('rollback'); }));
  assert.ok(db.prepare("SELECT id FROM users WHERE id='org_b'").get()); db.close();
});
test('F01 saúde HTTP real', async () => {
  const db = openDb(':memory:'); const app = createApp({db});
  await new Promise(resolve => app.listen(0,'127.0.0.1',resolve));
  try { const response = await fetch(`http://127.0.0.1:${app.address().port}/api/health`); assert.equal(response.status,200); assert.deepEqual(await response.json(),{status:'ok'}); }
  finally { await new Promise(resolve => app.close(resolve)); db.close(); }
});
