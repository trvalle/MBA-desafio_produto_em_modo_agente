import { randomBytes } from 'node:crypto';
import { transaction } from './db.js';
import { body, HttpError, json } from './http.js';
import { hashPassword, id, validEmail, verifyPassword } from './security.js';

const COOKIE = 'catraca_session';
const SESSION_SECONDS = 7 * 24 * 60 * 60;
const PUBLIC_FIELDS = 'id, name, email, role';
// Unknown accounts still run the password verifier, like known accounts.
const DUMMY_PASSWORD_HASH = hashPassword('unusable-placeholder-password');

function sessionId(req) {
  const cookies = (req.headers.cookie || '').split(';');
  const matches = cookies.map(cookie => cookie.trim()).filter(cookie => cookie.startsWith(`${COOKIE}=`));
  if (matches.length !== 1) return null;
  const value = matches[0].slice(COOKIE.length + 1);
  return /^[a-f0-9]{64}$/.test(value) ? value : null;
}

function cookie(value, maxAge = SESSION_SECONDS) {
  return `${COOKIE}=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}`;
}

export function currentUser(db, req) {
  const token = sessionId(req);
  if (!token) return null;
  return db.prepare(`SELECT u.id, u.name, u.email, u.role FROM sessions s
    JOIN users u ON u.id=s.userId WHERE s.id=? AND s.expiresAt>?`).get(token, Date.now()) || null;
}

export function requireUser(db, req, role) {
  const user = currentUser(db, req);
  if (!user) throw new HttpError(401, 'unauthorized');
  if (role && user.role !== role) throw new HttpError(403, 'forbidden');
  return user;
}

function startSession(db, req, userId) {
  const token = randomBytes(32).toString('hex');
  const previous = sessionId(req);
  if (previous) db.prepare('DELETE FROM sessions WHERE id=?').run(previous);
  db.prepare('DELETE FROM sessions WHERE expiresAt<=?').run(Date.now());
  db.prepare('INSERT INTO sessions(id,userId,expiresAt) VALUES(?,?,?)')
    .run(token, userId, Date.now() + SESSION_SECONDS * 1000);
  return cookie(token);
}

function credentials(input, registration = false) {
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  if (!validEmail(email) || typeof input.password !== 'string'
    || input.password.length < (registration ? 8 : 1) || input.password.length > 128) {
    throw new HttpError(422, 'invalid_request');
  }
  return { email, password: input.password };
}

export async function authHandler({ req, res, url, db }) {
  const path = url.pathname;
  if (req.method === 'GET' && path === '/api/auth/me') {
    json(res, 200, { user: currentUser(db, req) });
    return true;
  }
  if (req.method !== 'POST') return false;
  if (path === '/api/auth/register') {
    const input = await body(req);
    const { email, password } = credentials(input, true);
    const name = typeof input.name === 'string' ? input.name.trim() : '';
    if (!name || name.length > 100) throw new HttpError(422, 'invalid_request');
    const passwordHash = hashPassword(password);
    const result = transaction(db, () => {
      if (db.prepare('SELECT id FROM users WHERE email=?').get(email)) throw new HttpError(409, 'email_in_use');
      const user = { id: id('usr'), name, email, role: 'participant' };
      db.prepare('INSERT INTO users(id,name,email,passwordHash,role) VALUES(?,?,?,?,?)')
        .run(user.id, name, email, passwordHash, user.role);
      return { user, sessionCookie: startSession(db, req, user.id) };
    });
    json(res, 201, { user: result.user }, { 'Set-Cookie': result.sessionCookie });
    return true;
  }
  if (path === '/api/auth/login') {
    const { email, password } = credentials(await body(req));
    const account = db.prepare('SELECT id,passwordHash FROM users WHERE email=?').get(email);
    const valid = verifyPassword(password, account?.passwordHash || DUMMY_PASSWORD_HASH);
    if (!account || !valid) throw new HttpError(401, 'invalid_credentials');
    const user = db.prepare(`SELECT ${PUBLIC_FIELDS} FROM users WHERE id=?`).get(account.id);
    const sessionCookie = transaction(db, () => startSession(db, req, user.id));
    json(res, 200, { user }, { 'Set-Cookie': sessionCookie });
    return true;
  }
  if (path === '/api/auth/logout') {
    const token = sessionId(req);
    if (token) db.prepare('DELETE FROM sessions WHERE id=?').run(token);
    json(res, 200, { user: null }, { 'Set-Cookie': cookie('', 0) });
    return true;
  }
  return false;
}
