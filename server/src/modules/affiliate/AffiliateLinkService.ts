import type { SqliteDatabase } from '../../db/database.js';
import { createId, createOpaqueToken, nowIso } from '../../lib/ids.js';
import type { MockAffiliateProvider } from '../../providers/mock/types.js';
import type { ShopeeAffiliateProvider } from '../../providers/shopee/ShopeeAffiliateProvider.js';

export interface StoredAffiliateLink {
  id: string;
  token: string;
  userId: string;
  platform: 'shopee' | 'tiktok';
  originUrl: string;
  normalizedUrl: string;
  providerUrl: string;
  trackingTag: string;
  status: 'active' | 'disabled' | 'failed';
  createdAt: string;
}

interface AffiliateLinkRow {
  id: string;
  token: string;
  user_id: string;
  platform: 'shopee' | 'tiktok';
  origin_url: string;
  normalized_url: string;
  provider_url: string;
  tracking_tag: string;
  status: 'active' | 'disabled' | 'failed';
  created_at: string;
}

const mapRow = (row: AffiliateLinkRow): StoredAffiliateLink => ({
  id: row.id,
  token: row.token,
  userId: row.user_id,
  platform: row.platform,
  originUrl: row.origin_url,
  normalizedUrl: row.normalized_url,
  providerUrl: row.provider_url,
  trackingTag: row.tracking_tag,
  status: row.status,
  createdAt: row.created_at,
});

export class AffiliateLinkService {
  constructor(
    private readonly database: SqliteDatabase,
    private readonly shopee: ShopeeAffiliateProvider,
    private readonly tikTok: MockAffiliateProvider,
  ) {}

  async createLink(userId: string, platform: 'shopee' | 'tiktok', destinationUrl: string): Promise<StoredAffiliateLink> {
    if (platform === 'shopee') return this.createShopeeLink(userId, destinationUrl);

    const id = createId('link');
    const token = createOpaqueToken(18);
    const trackingTag = createOpaqueToken(18).replaceAll('-', '_');
    const result = await this.tikTok.createAffiliateLink({ sourceUrl: destinationUrl, trackingTag });
    const timestamp = nowIso();
    this.database.prepare(`
      INSERT INTO affiliate_links(
        id, token, user_id, platform, origin_url, normalized_url, provider_url, tracking_tag,
        provider_payload_json, status, created_at, updated_at
      ) VALUES (?, ?, ?, 'tiktok', ?, ?, ?, ?, ?, 'active', ?, ?)
    `).run(
      id, token, userId, destinationUrl, result.sourceUrl, result.sourceUrl, trackingTag,
      JSON.stringify(result), timestamp, timestamp,
    );
    return {
      id, token, userId, platform: 'tiktok', originUrl: destinationUrl,
      normalizedUrl: result.sourceUrl, providerUrl: result.sourceUrl, trackingTag,
      status: 'active', createdAt: timestamp,
    };
  }

  async createShopeeLink(userId: string, destinationUrl: string): Promise<StoredAffiliateLink> {
    const id = createId('link');
    const token = createOpaqueToken(18);
    const trackingTag = createOpaqueToken(18).replaceAll('-', '_');
    const result = await this.shopee.createTrackingLink({ destinationUrl, clickToken: trackingTag });
    const timestamp = nowIso();
    this.database.prepare(`
      INSERT INTO affiliate_links(
        id, token, user_id, platform, origin_url, normalized_url, provider_url, tracking_tag,
        provider_payload_json, status, created_at, updated_at
      ) VALUES (?, ?, ?, 'shopee', ?, ?, ?, ?, ?, 'active', ?, ?)
    `).run(
      id, token, userId, destinationUrl, result.destinationUrl, result.providerUrl, trackingTag,
      result.raw == null ? null : JSON.stringify(result.raw), timestamp, timestamp,
    );
    return { id, token, userId, platform: 'shopee', originUrl: destinationUrl, normalizedUrl: result.destinationUrl, providerUrl: result.providerUrl, trackingTag, status: 'active', createdAt: timestamp };
  }

  getByToken(token: string): StoredAffiliateLink | null {
    const row = this.database.prepare('SELECT * FROM affiliate_links WHERE token = ?').get(token) as AffiliateLinkRow | undefined;
    return row ? mapRow(row) : null;
  }

  listByUser(userId: string): StoredAffiliateLink[] {
    return (this.database.prepare('SELECT * FROM affiliate_links WHERE user_id = ? ORDER BY created_at DESC').all(userId) as AffiliateLinkRow[]).map(mapRow);
  }

  recordClick(input: { linkId: string; userId?: string; ipHash?: string; userAgent?: string; referer?: string }) {
    this.database.prepare(`
      INSERT INTO affiliate_clicks(id, affiliate_link_id, user_id, ip_hash, user_agent, referer, clicked_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      createId('click'), input.linkId, input.userId ?? null, input.ipHash ?? null,
      input.userAgent?.slice(0, 512) ?? null, input.referer?.slice(0, 512) ?? null, nowIso(),
    );
  }
}
