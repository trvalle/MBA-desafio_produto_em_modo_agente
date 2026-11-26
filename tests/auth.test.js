import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/db.js';
import { createApp } from '../src/server.js';
import { authHandler, currentUser, requireUser } from '../src/auth.js';
import { verifyPassword } from '../src/security.js';

async function fixture(t) {
  const db = openDb(':memory:');
  const app = createApp({ db, handlers: [authHandler] });
  await new Promise(resolve => app.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    await new Promise(resolve => app.close(resolve));
    db.close();
  });
  const base = `http://127.0.0.1:${app.address().port}`;
  async function request(path, { method = 'GET', data, cookie, raw, origin } = {}) {
    const response = await fetch(base + path, {
      method,
      headers: {
        ...(data !== undefined || raw !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
        ...(origin ? { Origin: origin } : {})
      },
      body: raw !== undefined ? raw : data !== undefined ? JSON.stringify(data) : undefined
    });
    return { status: response.status, data: await response.json(), setCookie: response.headers.get('set-cookie') };
  }
  return { db, request };
}

const registration = { name: 'Ana Silva', email: 'ana@example.com', password: 'Senha-forte123!' };
const seedPassword = 'Catraca123!';
const cookieOf = response => response.setCookie.split(';')[0];
const reqWithCookie = cookie => ({ headers: cookie ? { cookie } : {} });
function publicUser(user) {
  assert.deepEqual(Object.keys(user).sort(), ['email', 'id', 'name', 'role']);
}

test('F02 cadastro, me, logout e novo login usam sessão persistida e senha protegida', async t => {
  const { db, request } = await fixture(t);
  assert.deepEqual((await request('/api/auth/me')).data, { user: null });
  const registered = await request('/api/auth/register', { method: 'POST', data: registration });
  assert.equal(registered.status, 201);
  publicUser(registered.data.user);
  assert.equal(registered.data.user.role, 'participant');
  assert.equal(registered.data.user.name, registration.name);
  const cookie = cookieOf(registered);
  assert.match(cookie, /^catraca_session=[a-f0-9]{64}$/);
  for (const flag of ['HttpOnly', 'SameSite=Strict', 'Path=/']) assert.ok(registered.setCookie.includes(flag));
  assert.match(registered.setCookie, /Max-Age=604800/);
  const stored = db.prepare('SELECT * FROM users WHERE id=?').get(registered.data.user.id);
  assert.notEqual(stored.passwordHash, registration.password);
  assert.ok(verifyPassword(registration.password, stored.passwordHash));
  const me = await request('/api/auth/me', { cookie });
  assert.deepEqual(me.data, registered.data);
  const logout = await request('/api/auth/logout', { method: 'POST', cookie });
  assert.equal(logout.status, 200);
  assert.deepEqual(logout.data, { user: null });
  assert.match(logout.setCookie, /catraca_session=;.*Max-Age=0/);
  assert.deepEqual((await request('/api/auth/me', { cookie })).data, { user: null });
  assert.equal(db.prepare('SELECT COUNT(*) n FROM sessions').get().n, 0);
  const login = await request('/api/auth/login', { method: 'POST', data: registration });
  assert.equal(login.status, 200);
  assert.deepEqual(login.data, registered.data);
  assert.notEqual(cookieOf(login), cookie);
  assert.deepEqual((await request('/api/auth/me', { cookie: cookieOf(login) })).data, login.data);
});

test('F02 cadastro não aceita elevação de papel e normaliza email sem duplicar contas', async t => {
  const { db, request } = await fixture(t);
  const registered = await request('/api/auth/register', {
    method: 'POST', data: { ...registration, name: ' Ana Silva ', email: ' ANA@EXAMPLE.COM ', role: 'organizer' }
  });
  assert.equal(registered.status, 201);
  assert.equal(registered.data.user.role, 'participant');
  assert.equal(registered.data.user.email, registration.email);
  assert.equal(registered.data.user.name, registration.name);
  assert.equal(db.prepare('SELECT role FROM users WHERE id=?').get(registered.data.user.id).role, 'participant');
  const duplicate = await request('/api/auth/register', { method: 'POST', data: registration });
  assert.equal(duplicate.status, 409);
  assert.deepEqual(duplicate.data, { error: 'email_in_use' });
  assert.equal(db.prepare('SELECT COUNT(*) n FROM users').get().n, 4);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM sessions').get().n, 1);
});

test('F02/CF01 três contas da seed autenticam com seus papéis; senhas erradas não autenticam', async t => {
  const { db, request } = await fixture(t);
  for (const [email, role] of [
    ['organizador.a@catraca.local', 'organizer'],
    ['organizador.b@catraca.local', 'organizer'],
    ['participante@catraca.local', 'participant']
  ]) {
    const response = await request('/api/auth/login', { method: 'POST', data: { email, password: seedPassword } });
    assert.equal(response.status, 200);
    publicUser(response.data.user);
    assert.equal(response.data.user.role, role);
    assert.equal(response.data.user.email, email);
    assert.deepEqual((await request('/api/auth/me', { cookie: cookieOf(response) })).data, response.data);
    const wrong = await request('/api/auth/login', { method: 'POST', data: { email, password: 'senha-errada' } });
    assert.equal(wrong.status, 401);
    assert.deepEqual(wrong.data, { error: 'invalid_credentials' });
    assert.equal(wrong.setCookie, null);
  }
  const unknown = await request('/api/auth/login', { method: 'POST', data: { email: 'absent@example.com', password: seedPassword } });
  assert.equal(unknown.status, 401);
  assert.deepEqual(unknown.data, { error: 'invalid_credentials' });
  assert.equal(db.prepare('SELECT COUNT(*) n FROM sessions').get().n, 3);
});

test('F02 requireUser retorna somente campos públicos e distingue visitante de papel incorreto', async t => {
  const { db, request } = await fixture(t);
  assert.equal(currentUser(db, reqWithCookie()), null);
  assert.throws(() => requireUser(db, reqWithCookie(), 'organizer'), { status: 401, error: 'unauthorized' });
  for (const [email, role, forbiddenRole] of [
    ['participante@catraca.local', 'participant', 'organizer'],
    ['organizador.a@catraca.local', 'organizer', 'participant']
  ]) {
    const login = await request('/api/auth/login', { method: 'POST', data: { email, password: seedPassword } });
    const req = reqWithCookie(cookieOf(login));
    const user = requireUser(db, req, role);
    publicUser(user);
    assert.equal(user.role, role);
    assert.deepEqual(requireUser(db, req), user);
    assert.throws(() => requireUser(db, req, forbiddenRole), { status: 403, error: 'forbidden' });
  }
});

test('F02 login rotaciona sessão; falha de login preserva sessão anterior; logout é idempotente', async t => {
  const { db, request } = await fixture(t);
  const data = { email: 'participante@catraca.local', password: seedPassword };
  const first = await request('/api/auth/login', { method: 'POST', data });
  const oldCookie = cookieOf(first);
  const failed = await request('/api/auth/login', { method: 'POST', cookie: oldCookie, data: { ...data, password: 'errada' } });
  assert.equal(failed.status, 401);
  assert.deepEqual((await request('/api/auth/me', { cookie: oldCookie })).data, first.data);
  const second = await request('/api/auth/login', { method: 'POST', data, cookie: oldCookie });
  assert.notEqual(cookieOf(second), oldCookie);
  assert.deepEqual((await request('/api/auth/me', { cookie: oldCookie })).data, { user: null });
  assert.equal(db.prepare('SELECT COUNT(*) n FROM sessions').get().n, 1);
  for (let attempt = 0; attempt < 2; attempt++) {
    const logout = await request('/api/auth/logout', { method: 'POST', cookie: cookieOf(second) });
    assert.equal(logout.status, 200);
  }
  assert.deepEqual((await request('/api/auth/me', { cookie: cookieOf(second) })).data, { user: null });
});

test('F02 sessões expiradas, forjadas, malformadas e cookies ambíguos não autenticam', async t => {
  const { db, request } = await fixture(t);
  const login = await request('/api/auth/login', {
    method: 'POST', data: { email: 'organizador.a@catraca.local', password: seedPassword }
  });
  const cookie = cookieOf(login);
  assert.deepEqual((await request('/api/auth/me', { cookie: `theme=dark; ${cookie}; other=value` })).data, login.data);
  for (const malformed of [
    'catraca_session=%ZZ', `catraca_session=${'0'.repeat(64)}`, 'catraca_session=',
    `${cookie}; ${cookie}`, `prefix_${cookie}`, "catraca_session=' OR 1=1 --"
  ]) {
    assert.deepEqual((await request('/api/auth/me', { cookie: malformed })).data, { user: null });
  }
  db.prepare('UPDATE sessions SET expiresAt=?').run(Date.now() - 1);
  assert.deepEqual((await request('/api/auth/me', { cookie })).data, { user: null });
  assert.throws(() => requireUser(db, reqWithCookie(cookie), 'organizer'), { status: 401 });
});

test('F02 entradas inválidas não criam usuários nem sessões e rotas desconhecidas não são capturadas', async t => {
  const { db, request } = await fixture(t);
  const invalid = [
    {}, { ...registration, name: '' }, { ...registration, name: ' '.repeat(5) },
    { ...registration, name: 123 }, { ...registration, name: 'a'.repeat(101) },
    { ...registration, email: 'invalid' }, { ...registration, email: null },
    { ...registration, password: 'short' }, { ...registration, password: 12345678 },
    { ...registration, password: 'a'.repeat(129) }
  ];
  for (const data of invalid) {
    const response = await request('/api/auth/register', { method: 'POST', data });
    assert.equal(response.status, 422);
    assert.deepEqual(response.data, { error: 'invalid_request' });
  }
  for (const path of ['/api/auth/register', '/api/auth/login']) {
    for (const raw of ['{', 'null', '[]', 'true', '"text"']) {
      assert.equal((await request(path, { method: 'POST', raw })).status, 422);
    }
  }
  assert.equal((await request('/api/auth/register')).status, 404);
  assert.equal((await request('/api/auth/unknown', { method: 'POST', raw: '{}' })).status, 404);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM users').get().n, 3);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM sessions').get().n, 0);
});

test('F02 cadastro reverte conta quando inserção da sessão falha', async t => {
  const { db } = await fixture(t);
  db.exec("CREATE TRIGGER fail_session BEFORE INSERT ON sessions BEGIN SELECT RAISE(ABORT, 'test failure'); END");
  const req = Object.assign((async function* () { yield JSON.stringify(registration); })(), { method: 'POST', headers: {} });
  await assert.rejects(authHandler({ db, req, res: {}, url: new URL('http://localhost/api/auth/register') }), /test failure/);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM users').get().n, 3);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM sessions').get().n, 0);
});

test('F02 mutações de autenticação rejeitam origem externa pelo servidor', async t => {
  const { db, request } = await fixture(t);
  for (const path of ['/api/auth/register', '/api/auth/login', '/api/auth/logout']) {
    const response = await request(path, { method: 'POST', data: registration, origin: 'https://external.example' });
    assert.equal(response.status, 403);
    assert.deepEqual(response.data, { error: 'forbidden_origin' });
  }
  assert.equal(db.prepare('SELECT COUNT(*) n FROM users').get().n, 3);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM sessions').get().n, 0);
});
