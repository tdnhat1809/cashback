import type { SqliteDatabase } from './database.js';
import { nowIso } from '../lib/ids.js';

const carriers = ['SPX', 'LEX', 'EMS', 'J&T', 'GHN', '247Express', 'VNPost', 'Viettel Post', 'GHTK', 'Best', 'Futa', 'Nhất Tín', 'Netco', 'NetPost'];

const demoProducts = [
  ['seed_shopee_headphones', 'shopee', '6309028319', '52377417', 'Tai nghe Bluetooth chống ồn', 'Shopee Mall', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=700', 199000, 350000, 'https://shopee.vn/product-i.52377417.6309028319'],
  ['seed_shopee_charger', 'shopee', '112239401', '88776655', 'Củ sạc nhanh USB-C 20W', 'Official Store', 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=700', 250000, 320000, 'https://shopee.vn/product-i.88776655.112239401'],
] as const;

export const seedDatabase = (database: SqliteDatabase) => {
  const timestamp = nowIso();
  const transaction = database.transaction(() => {
    database.prepare(`
      INSERT OR IGNORE INTO users(id, public_id, phone, name, role, status, created_at, updated_at)
      VALUES ('seed_admin', 'ADMIN-DEMO', '+84900000000', 'Quản trị viên demo', 'admin', 'active', ?, ?)
    `).run(timestamp, timestamp);
    database.prepare(`
      INSERT OR IGNORE INTO cashback_policies(id, version, user_share_bps, withholding_tax_bps, effective_from, active, created_at)
      VALUES ('policy_mvp_v1', 'mvp-v1', 9000, 0, ?, 1, ?)
    `).run(timestamp, timestamp);
    for (const platform of ['shopee', 'tiktok']) {
      database.prepare(`
        INSERT OR IGNORE INTO cashback_policy_rules(id, policy_id, platform, category, approval_days, active)
        VALUES (?, 'policy_mvp_v1', ?, '*', ?, 1)
      `).run(`rule_${platform}_default`, platform, platform === 'shopee' ? 45 : 30);
    }
    for (const carrier of carriers) {
      database.prepare(`
        INSERT OR IGNORE INTO carrier_configs(code, name, mode, enabled, updated_at)
        VALUES (?, ?, 'mock', 1, ?)
      `).run(carrier.toLowerCase().replaceAll(/[^a-z0-9]+/g, '_'), carrier, timestamp);
    }
    database.prepare(`
      INSERT OR IGNORE INTO giftcodes(id, code, reward_type, reward_amount, usage_limit, starts_at, expires_at, active, created_at)
      VALUES ('gift_hv100', 'HV100', 'points', 100, 1000, '2026-01-01T00:00:00.000Z', '2027-01-01T00:00:00.000Z', 1, ?)
    `).run(timestamp);
    for (const product of demoProducts) {
      database.prepare(`
        INSERT OR IGNORE INTO products(
          id, platform, external_item_id, external_shop_id, name, shop_name, image_url,
          price_vnd, original_price_vnd, source_url, active, updated_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `).run(...product, timestamp, timestamp);
    }
  });
  transaction();
  return { carriers: carriers.length, products: demoProducts.length };
};
