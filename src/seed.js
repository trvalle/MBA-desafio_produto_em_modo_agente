import { openDb } from './db.js';
import { hashPassword } from './security.js';
import { pathToFileURL } from 'node:url';
export function seed(db) {
  const insert = db.prepare('INSERT OR IGNORE INTO users(id,name,email,passwordHash,role) VALUES(?,?,?,?,?)');
  for (const [id,name,email,role] of [
    ['org_a','Organizador A','organizador.a@catraca.local','organizer'],
    ['org_b','Organizador B','organizador.b@catraca.local','organizer'],
    ['participant','Participante','participante@catraca.local','participant']
  ]) {
    if (!db.prepare('SELECT id FROM users WHERE id=?').get(id)) insert.run(id,name,email,hashPassword('Catraca123!'),role);
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const db = openDb(); seed(db); db.close(); console.log('Seed pronta (idempotente).');
}
