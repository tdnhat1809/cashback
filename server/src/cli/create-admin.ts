import { loadConfig } from '../config.js';
import { openDatabase } from '../db/database.js';
import { createId, nowIso } from '../lib/ids.js';
import { normalizeVietnamesePhone } from '../modules/auth/phone.js';

const phoneInput = process.env.ADMIN_PHONE;
if (!phoneInput) throw new Error('ADMIN_PHONE is required.');

const config = loadConfig();
const database = openDatabase(config.DATABASE_PATH);
const phone = normalizeVietnamesePhone(phoneInput);
const name = process.env.ADMIN_NAME?.trim() || 'Quản trị viên';
const timestamp = nowIso();
const existing = database.prepare('SELECT id FROM users WHERE phone = ?').get(phone) as { id: string } | undefined;

if (existing) {
  database.prepare(`UPDATE users SET name = ?, role = 'admin', status = 'active', updated_at = ? WHERE id = ?`)
    .run(name, timestamp, existing.id);
} else {
  database.prepare(`
    INSERT INTO users(id, public_id, phone, name, role, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'admin', 'active', ?, ?)
  `).run(createId('user'), `ADMIN-${Date.now()}`, phone, name, timestamp, timestamp);
}

console.log(`Admin account is ready for ${phone}.`);
database.close();
