import { loadConfig } from '../config.js';
import { openDatabase } from '../db/database.js';
import { createId, nowIso } from '../lib/ids.js';
import { hashPassword } from '../modules/auth/crypto.js';

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('ADMIN_EMAIL must be a valid email address.');
if (!password || password.length < 10 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
  throw new Error('ADMIN_PASSWORD must have at least 10 characters and include letters and numbers.');
}

const config = loadConfig();
const database = openDatabase(config.DATABASE_PATH);
const name = process.env.ADMIN_NAME?.trim() || 'Quản trị viên';
const timestamp = nowIso();
const existing = database.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: string } | undefined;

if (existing) {
  database.transaction(() => {
    database.prepare(`UPDATE users SET name = ?, role = 'admin', status = 'active', updated_at = ? WHERE id = ?`)
      .run(name, timestamp, existing.id);
    database.prepare(`
      INSERT INTO auth_identities(id, user_id, provider, provider_subject, email, password_hash, created_at, updated_at)
      VALUES (?, ?, 'password', ?, ?, ?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET password_hash = excluded.password_hash, updated_at = excluded.updated_at
    `).run(createId('auth'), existing.id, email, email, hashPassword(password), timestamp, timestamp);
  })();
} else {
  const userId = createId('user');
  database.transaction(() => {
    database.prepare(`
      INSERT INTO users(id, public_id, phone, email, name, role, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'admin', 'active', ?, ?)
    `).run(userId, `ADMIN-${Date.now()}`, `identity:${createId('login')}`, email, name, timestamp, timestamp);
    database.prepare(`
      INSERT INTO auth_identities(id, user_id, provider, provider_subject, email, password_hash, created_at, updated_at)
      VALUES (?, ?, 'password', ?, ?, ?, ?, ?)
    `).run(createId('auth'), userId, email, email, hashPassword(password), timestamp, timestamp);
  })();
}

console.log(`Admin account is ready for ${email}.`);
database.close();
