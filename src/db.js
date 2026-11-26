import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
export function openDb(path = process.env.DB_PATH || 'data/catraca.sqlite') {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      passwordHash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('organizer','participant'))
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY, userId TEXT NOT NULL REFERENCES users(id), expiresAt INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY, organizerId TEXT NOT NULL REFERENCES users(id), name TEXT NOT NULL,
      startsAt TEXT NOT NULL, location TEXT NOT NULL, capacity INTEGER NOT NULL CHECK(typeof(capacity)='integer' AND capacity>=1),
      priceCents INTEGER NOT NULL CHECK(typeof(priceCents)='integer' AND priceCents>0),
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','cancelled'))
    );
    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, eventId TEXT NOT NULL REFERENCES events(id),
      userId TEXT REFERENCES users(id), buyerEmail TEXT NOT NULL, priceCents INTEGER NOT NULL CHECK(typeof(priceCents)='integer' AND priceCents>0),
      status TEXT NOT NULL CHECK(status IN ('pending','confirmed','declined','cancelled','refunded')),
      checkedIn INTEGER NOT NULL DEFAULT 0 CHECK(checkedIn IN (0,1)),
      createdAt INTEGER NOT NULL, dueAt INTEGER NOT NULL,
      approved INTEGER NOT NULL CHECK(approved IN (0,1))
    );
    CREATE INDEX IF NOT EXISTS tickets_event_status ON tickets(eventId,status);
    CREATE INDEX IF NOT EXISTS tickets_user ON tickets(userId);
    CREATE INDEX IF NOT EXISTS tickets_due ON tickets(status,dueAt);`);
  return db;
}
// All callbacks must be synchronous: the reserved write lock covers read + mutation.
export function transaction(db, fn) {
  if (fn.constructor.name === 'AsyncFunction') throw new TypeError('Transaction callback must be synchronous');
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    if (result && typeof result.then === 'function') throw new TypeError('Transaction callback must not return a Promise');
    db.exec('COMMIT'); return result;
  }
  catch (error) { db.exec('ROLLBACK'); throw error; }
}
export function occupied(db, eventId) {
  return db.prepare("SELECT COUNT(*) AS n FROM tickets WHERE eventId=? AND status IN ('pending','confirmed')").get(eventId).n;
}
export function available(db, event) { return event.status === 'cancelled' ? 0 : event.capacity - occupied(db, event.id); }
