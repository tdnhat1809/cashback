import type { SqliteDatabase } from '../../db/database.js';
import { createId, nowIso } from '../../lib/ids.js';

export class UserFeatureError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: Readonly<Record<string, unknown>>,
  ) {
    super(message);
    this.name = 'UserFeatureError';
  }
}

export interface UserFeaturesServiceOptions {
  database: SqliteDatabase;
  now?: () => Date;
  generateId?: (prefix: string) => string;
}

export interface PaginationInput {
  limit: number;
  offset: number;
}

export interface NotificationPreferencePatch {
  inApp?: boolean;
  email?: boolean;
  push?: boolean;
  shipmentUpdates?: boolean;
  cashbackUpdates?: boolean;
  promotions?: boolean;
}

export interface CreateSupportTicketInput {
  subject: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  linkedOrderId?: string;
  message: string;
  attachmentUrl?: string;
}

export interface AddSupportMessageInput {
  body: string;
  attachmentUrl?: string;
}

export interface ProfilePatch {
  name?: string;
  email?: string | null;
}

interface SavedProductRow {
  id: string;
  platform: string;
  external_item_id: string | null;
  external_shop_id: string | null;
  name: string;
  shop_name: string | null;
  image_url: string | null;
  price_vnd: number;
  original_price_vnd: number;
  source_url: string;
  active: number;
  saved_at: string;
  updated_at: string;
}

interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string;
  deep_link: string | null;
  read_at: string | null;
  created_at: string;
}

interface NotificationPreferencesRow {
  in_app: number;
  email: number;
  push: number;
  shipment_updates: number;
  cashback_updates: number;
  promotions: number;
  updated_at: string;
}

interface GiftcodeRow {
  id: string;
  code: string;
  reward_type: 'wallet' | 'points';
  reward_amount: number;
  usage_limit: number | null;
  used_count: number;
  starts_at: string;
  expires_at: string;
  active: number;
}

interface PointAccountRow {
  id: string;
  balance: number;
  updated_at: string;
}

interface UserProfileRow {
  id: string;
  public_id: string;
  phone: string;
  email: string | null;
  name: string;
  role: string;
  status: string;
  created_at: string;
  updated_at: string;
}

const isUniqueConstraint = (error: unknown): boolean =>
  error instanceof Error && (error.message.includes('UNIQUE constraint failed') || error.message.includes('SQLITE_CONSTRAINT_UNIQUE'));

const parseJsonObject = (value: string | null): Record<string, unknown> | null => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
};

const toSavedProduct = (row: SavedProductRow) => ({
  id: row.id,
  platform: row.platform,
  externalItemId: row.external_item_id,
  externalShopId: row.external_shop_id,
  name: row.name,
  shopName: row.shop_name,
  imageUrl: row.image_url,
  priceVnd: row.price_vnd,
  originalPriceVnd: row.original_price_vnd,
  sourceUrl: row.source_url,
  active: row.active === 1,
  savedAt: row.saved_at,
  updatedAt: row.updated_at,
});

const toNotification = (row: NotificationRow) => ({
  id: row.id,
  type: row.type,
  title: row.title,
  body: row.body,
  deepLink: row.deep_link,
  readAt: row.read_at,
  createdAt: row.created_at,
});

const toNotificationPreferences = (row: NotificationPreferencesRow) => ({
  inApp: row.in_app === 1,
  email: row.email === 1,
  push: row.push === 1,
  shipmentUpdates: row.shipment_updates === 1,
  cashbackUpdates: row.cashback_updates === 1,
  promotions: row.promotions === 1,
  updatedAt: row.updated_at,
});

const toProfile = (row: UserProfileRow) => ({
  id: row.id,
  publicId: row.public_id,
  phone: row.phone,
  email: row.email,
  name: row.name,
  role: row.role,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export class UserFeaturesService {
  private readonly database: SqliteDatabase;
  private readonly now: () => Date;
  private readonly generateId: (prefix: string) => string;

  constructor(options: UserFeaturesServiceOptions) {
    this.database = options.database;
    this.now = options.now ?? (() => new Date());
    this.generateId = options.generateId ?? createId;
  }

  listSavedProducts(userId: string, pagination: PaginationInput) {
    const rows = this.database.prepare(`
      SELECT p.id, p.platform, p.external_item_id, p.external_shop_id, p.name, p.shop_name,
             p.image_url, p.price_vnd, p.original_price_vnd, p.source_url, p.active,
             sp.created_at AS saved_at, p.updated_at
      FROM saved_products sp
      INNER JOIN products p ON p.id = sp.product_id
      WHERE sp.user_id = ?
      ORDER BY sp.created_at DESC
      LIMIT ? OFFSET ?
    `).all(userId, pagination.limit, pagination.offset) as SavedProductRow[];
    const total = (this.database.prepare('SELECT count(*) AS count FROM saved_products WHERE user_id = ?')
      .get(userId) as { count: number }).count;
    return { items: rows.map(toSavedProduct), total, ...pagination };
  }

  saveProduct(userId: string, productId: string) {
    const product = this.database.prepare('SELECT id FROM products WHERE id = ? AND active = 1').get(productId) as { id: string } | undefined;
    if (!product) throw new UserFeatureError('product_not_found', 'Không tìm thấy sản phẩm đang hoạt động.', 404);
    const timestamp = this.timestamp();
    const result = this.database.prepare('INSERT OR IGNORE INTO saved_products(user_id, product_id, created_at) VALUES (?, ?, ?)')
      .run(userId, productId, timestamp);
    if (result.changes === 1) this.writeAudit(userId, 'saved_product.created', 'product', productId);
    return { productId, saved: true, created: result.changes === 1, savedAt: timestamp };
  }

  removeSavedProduct(userId: string, productId: string) {
    const result = this.database.prepare('DELETE FROM saved_products WHERE user_id = ? AND product_id = ?').run(userId, productId);
    if (result.changes === 1) this.writeAudit(userId, 'saved_product.deleted', 'product', productId);
    return { productId, saved: false, removed: result.changes === 1 };
  }

  toggleSavedProduct(userId: string, productId: string) {
    return this.database.transaction(() => {
      const saved = this.database.prepare('SELECT 1 FROM saved_products WHERE user_id = ? AND product_id = ?')
        .get(userId, productId);
      return saved ? this.removeSavedProduct(userId, productId) : this.saveProduct(userId, productId);
    })();
  }

  listNotifications(userId: string, pagination: PaginationInput, unreadOnly = false) {
    const unread = unreadOnly ? 1 : 0;
    const rows = this.database.prepare(`
      SELECT id, type, title, body, deep_link, read_at, created_at
      FROM notifications
      WHERE user_id = ? AND (? = 0 OR read_at IS NULL)
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(userId, unread, pagination.limit, pagination.offset) as NotificationRow[];
    const counts = this.database.prepare(`
      SELECT count(*) AS total, sum(CASE WHEN read_at IS NULL THEN 1 ELSE 0 END) AS unread
      FROM notifications WHERE user_id = ?
    `).get(userId) as { total: number; unread: number | null };
    return { items: rows.map(toNotification), total: counts.total, unread: counts.unread ?? 0, ...pagination };
  }

  markNotificationRead(userId: string, notificationId: string) {
    const existing = this.database.prepare(`
      SELECT id, type, title, body, deep_link, read_at, created_at
      FROM notifications WHERE id = ? AND user_id = ?
    `).get(notificationId, userId) as NotificationRow | undefined;
    if (!existing) throw new UserFeatureError('notification_not_found', 'Không tìm thấy thông báo.', 404);
    if (!existing.read_at) {
      existing.read_at = this.timestamp();
      this.database.prepare('UPDATE notifications SET read_at = ? WHERE id = ? AND user_id = ?')
        .run(existing.read_at, notificationId, userId);
    }
    return toNotification(existing);
  }

  markAllNotificationsRead(userId: string) {
    const readAt = this.timestamp();
    const result = this.database.prepare('UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL')
      .run(readAt, userId);
    return { updated: result.changes, readAt };
  }

  getNotificationPreferences(userId: string) {
    const timestamp = this.timestamp();
    this.database.prepare(`
      INSERT OR IGNORE INTO notification_preferences(
        user_id, in_app, email, push, shipment_updates, cashback_updates, promotions, updated_at
      ) VALUES (?, 1, 0, 0, 1, 1, 0, ?)
    `).run(userId, timestamp);
    const row = this.database.prepare(`
      SELECT in_app, email, push, shipment_updates, cashback_updates, promotions, updated_at
      FROM notification_preferences WHERE user_id = ?
    `).get(userId) as NotificationPreferencesRow;
    return toNotificationPreferences(row);
  }

  updateNotificationPreferences(userId: string, patch: NotificationPreferencePatch) {
    const current = this.getNotificationPreferences(userId);
    const next = { ...current, ...patch, updatedAt: this.timestamp() };
    this.database.prepare(`
      UPDATE notification_preferences
      SET in_app = ?, email = ?, push = ?, shipment_updates = ?, cashback_updates = ?, promotions = ?, updated_at = ?
      WHERE user_id = ?
    `).run(
      Number(next.inApp), Number(next.email), Number(next.push), Number(next.shipmentUpdates),
      Number(next.cashbackUpdates), Number(next.promotions), next.updatedAt, userId,
    );
    this.writeAudit(userId, 'notification_preferences.updated', 'user', userId, patch as Record<string, unknown>);
    return next;
  }

  redeemGiftcode(userId: string, rawCode: string) {
    const code = rawCode.trim().toUpperCase();
    return this.database.transaction(() => {
      const giftcode = this.database.prepare(`
        SELECT id, code, reward_type, reward_amount, usage_limit, used_count, starts_at, expires_at, active
        FROM giftcodes WHERE upper(code) = ?
      `).get(code) as GiftcodeRow | undefined;
      if (!giftcode) throw new UserFeatureError('giftcode_not_found', 'Giftcode không tồn tại.', 404);
      if (giftcode.reward_type !== 'points') {
        throw new UserFeatureError('giftcode_cash_disabled', 'Giftcode quy đổi tiền chưa được hỗ trợ; chỉ giftcode điểm được phép.', 422);
      }

      const prior = this.database.prepare(`
        SELECT pa.balance, ple.amount, gr.created_at
        FROM giftcode_redemptions gr
        INNER JOIN point_ledger_entries ple ON ple.id = gr.point_ledger_entry_id
        INNER JOIN point_accounts pa ON pa.id = ple.point_account_id
        WHERE gr.giftcode_id = ? AND gr.user_id = ?
      `).get(giftcode.id, userId) as { balance: number; amount: number; created_at: string } | undefined;
      if (prior) {
        return { code: giftcode.code, points: prior.amount, balance: prior.balance, redeemedAt: prior.created_at, alreadyRedeemed: true };
      }

      const now = this.now();
      if (giftcode.active !== 1 || now < new Date(giftcode.starts_at) || now >= new Date(giftcode.expires_at)) {
        throw new UserFeatureError('giftcode_inactive', 'Giftcode chưa có hiệu lực hoặc đã hết hạn.', 422);
      }
      const timestamp = now.toISOString();
      const claimed = this.database.prepare(`
        UPDATE giftcodes SET used_count = used_count + 1
        WHERE id = ? AND active = 1 AND (usage_limit IS NULL OR used_count < usage_limit)
      `).run(giftcode.id);
      if (claimed.changes !== 1) throw new UserFeatureError('giftcode_exhausted', 'Giftcode đã hết lượt sử dụng.', 409);

      let account = this.database.prepare('SELECT id, balance, updated_at FROM point_accounts WHERE user_id = ?')
        .get(userId) as PointAccountRow | undefined;
      if (!account) {
        const accountId = this.generateId('points');
        this.database.prepare('INSERT INTO point_accounts(id, user_id, balance, updated_at) VALUES (?, ?, 0, ?)')
          .run(accountId, userId, timestamp);
        account = { id: accountId, balance: 0, updated_at: timestamp };
      }
      const ledgerId = this.generateId('point_entry');
      const redemptionId = this.generateId('gift_redeem');
      this.database.prepare(`
        INSERT INTO point_ledger_entries(id, point_account_id, amount, idempotency_key, description, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(ledgerId, account.id, giftcode.reward_amount, `giftcode:${giftcode.id}:${userId}`, `Giftcode ${giftcode.code}`, timestamp);
      this.database.prepare('UPDATE point_accounts SET balance = balance + ?, updated_at = ? WHERE id = ?')
        .run(giftcode.reward_amount, timestamp, account.id);
      this.database.prepare(`
        INSERT INTO giftcode_redemptions(id, giftcode_id, user_id, point_ledger_entry_id, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(redemptionId, giftcode.id, userId, ledgerId, timestamp);
      this.writeAudit(userId, 'giftcode.redeemed', 'giftcode', giftcode.id, { code: giftcode.code, points: giftcode.reward_amount });
      return {
        code: giftcode.code,
        points: giftcode.reward_amount,
        balance: account.balance + giftcode.reward_amount,
        redeemedAt: timestamp,
        alreadyRedeemed: false,
      };
    })();
  }

  getPoints(userId: string, pagination: PaginationInput) {
    const account = this.database.prepare('SELECT id, balance, updated_at FROM point_accounts WHERE user_id = ?')
      .get(userId) as PointAccountRow | undefined;
    if (!account) return { balance: 0, updatedAt: null, entries: [], total: 0, ...pagination };
    const entries = this.database.prepare(`
      SELECT id, amount, description, created_at
      FROM point_ledger_entries WHERE point_account_id = ?
      ORDER BY created_at DESC LIMIT ? OFFSET ?
    `).all(account.id, pagination.limit, pagination.offset) as Array<{ id: string; amount: number; description: string; created_at: string }>;
    const total = (this.database.prepare('SELECT count(*) AS count FROM point_ledger_entries WHERE point_account_id = ?')
      .get(account.id) as { count: number }).count;
    return {
      balance: account.balance,
      updatedAt: account.updated_at,
      entries: entries.map((entry) => ({ id: entry.id, amount: entry.amount, description: entry.description, createdAt: entry.created_at })),
      total,
      ...pagination,
    };
  }

  getReferralSummary(userId: string, pagination: PaginationInput) {
    const profile = this.getProfile(userId);
    const counts = this.database.prepare(`
      SELECT count(*) AS total,
             sum(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
             sum(CASE WHEN status = 'qualified' THEN 1 ELSE 0 END) AS qualified,
             sum(CASE WHEN status = 'rewarded' THEN 1 ELSE 0 END) AS rewarded,
             sum(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected
      FROM referrals WHERE referrer_user_id = ?
    `).get(userId) as Record<'total' | 'pending' | 'qualified' | 'rewarded' | 'rejected', number | null>;
    const rows = this.database.prepare(`
      SELECT r.id, r.status, r.qualified_at, r.rewarded_at, r.created_at,
             u.public_id, u.name
      FROM referrals r INNER JOIN users u ON u.id = r.referred_user_id
      WHERE r.referrer_user_id = ?
      ORDER BY r.created_at DESC LIMIT ? OFFSET ?
    `).all(userId, pagination.limit, pagination.offset) as Array<{
      id: string; status: string; qualified_at: string | null; rewarded_at: string | null; created_at: string;
      public_id: string; name: string;
    }>;
    return {
      referralCode: profile.publicId,
      counts: {
        total: counts.total ?? 0,
        pending: counts.pending ?? 0,
        qualified: counts.qualified ?? 0,
        rewarded: counts.rewarded ?? 0,
        rejected: counts.rejected ?? 0,
      },
      items: rows.map((row) => ({
        id: row.id,
        referredUser: { publicId: row.public_id, name: row.name },
        status: row.status,
        qualifiedAt: row.qualified_at,
        rewardedAt: row.rewarded_at,
        createdAt: row.created_at,
      })),
      ...pagination,
    };
  }

  createSupportTicket(userId: string, input: CreateSupportTicketInput) {
    if (input.linkedOrderId) this.assertOwnedOrder(userId, input.linkedOrderId);
    return this.database.transaction(() => {
      const timestamp = this.timestamp();
      const ticketId = this.generateId('ticket');
      const messageId = this.generateId('support_message');
      this.database.prepare(`
        INSERT INTO support_tickets(id, user_id, subject, category, priority, status, linked_order_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'open', ?, ?, ?)
      `).run(ticketId, userId, input.subject, input.category, input.priority, input.linkedOrderId ?? null, timestamp, timestamp);
      this.database.prepare(`
        INSERT INTO support_messages(id, ticket_id, sender_user_id, sender_type, body, attachment_url, created_at)
        VALUES (?, ?, ?, 'user', ?, ?, ?)
      `).run(messageId, ticketId, userId, input.message, input.attachmentUrl ?? null, timestamp);
      this.writeAudit(userId, 'support_ticket.created', 'support_ticket', ticketId, { category: input.category, priority: input.priority });
      return this.getSupportTicket(userId, ticketId);
    })();
  }

  listSupportTickets(userId: string, pagination: PaginationInput, status?: 'open' | 'resolved' | 'closed') {
    const rows = this.database.prepare(`
      SELECT t.id, t.subject, t.category, t.priority, t.status, t.linked_order_id, t.created_at, t.updated_at,
             (SELECT count(*) FROM support_messages m WHERE m.ticket_id = t.id) AS message_count,
             (SELECT body FROM support_messages m WHERE m.ticket_id = t.id ORDER BY m.created_at DESC LIMIT 1) AS last_message
      FROM support_tickets t
      WHERE t.user_id = ? AND (? IS NULL OR t.status = ?)
      ORDER BY t.updated_at DESC LIMIT ? OFFSET ?
    `).all(userId, status ?? null, status ?? null, pagination.limit, pagination.offset) as Array<{
      id: string; subject: string; category: string; priority: string; status: string; linked_order_id: string | null;
      created_at: string; updated_at: string; message_count: number; last_message: string | null;
    }>;
    const total = (this.database.prepare('SELECT count(*) AS count FROM support_tickets WHERE user_id = ? AND (? IS NULL OR status = ?)')
      .get(userId, status ?? null, status ?? null) as { count: number }).count;
    return {
      items: rows.map((row) => ({
        id: row.id,
        subject: row.subject,
        category: row.category,
        priority: row.priority,
        status: row.status,
        linkedOrderId: row.linked_order_id,
        messageCount: row.message_count,
        lastMessage: row.last_message,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
      total,
      ...pagination,
    };
  }

  getSupportTicket(userId: string, ticketId: string) {
    const ticket = this.database.prepare(`
      SELECT id, subject, category, priority, status, linked_order_id, assigned_to, created_at, updated_at
      FROM support_tickets WHERE id = ? AND user_id = ?
    `).get(ticketId, userId) as {
      id: string; subject: string; category: string; priority: string; status: string; linked_order_id: string | null;
      assigned_to: string | null; created_at: string; updated_at: string;
    } | undefined;
    if (!ticket) throw new UserFeatureError('support_ticket_not_found', 'Không tìm thấy yêu cầu hỗ trợ.', 404);
    const messages = this.database.prepare(`
      SELECT id, sender_user_id, sender_type, body, attachment_url, created_at
      FROM support_messages WHERE ticket_id = ? ORDER BY created_at ASC, id ASC
    `).all(ticketId) as Array<{
      id: string; sender_user_id: string | null; sender_type: string; body: string; attachment_url: string | null; created_at: string;
    }>;
    return {
      id: ticket.id,
      subject: ticket.subject,
      category: ticket.category,
      priority: ticket.priority,
      status: ticket.status,
      linkedOrderId: ticket.linked_order_id,
      assignedTo: ticket.assigned_to,
      createdAt: ticket.created_at,
      updatedAt: ticket.updated_at,
      messages: messages.map((message) => ({
        id: message.id,
        senderUserId: message.sender_user_id,
        senderType: message.sender_type,
        body: message.body,
        attachmentUrl: message.attachment_url,
        createdAt: message.created_at,
      })),
    };
  }

  addSupportMessage(userId: string, ticketId: string, input: AddSupportMessageInput) {
    return this.database.transaction(() => {
      const ticket = this.database.prepare('SELECT status FROM support_tickets WHERE id = ? AND user_id = ?')
        .get(ticketId, userId) as { status: string } | undefined;
      if (!ticket) throw new UserFeatureError('support_ticket_not_found', 'Không tìm thấy yêu cầu hỗ trợ.', 404);
      if (ticket.status !== 'open') throw new UserFeatureError('support_ticket_closed', 'Yêu cầu hỗ trợ này đã đóng.', 409);
      const timestamp = this.timestamp();
      const id = this.generateId('support_message');
      this.database.prepare(`
        INSERT INTO support_messages(id, ticket_id, sender_user_id, sender_type, body, attachment_url, created_at)
        VALUES (?, ?, ?, 'user', ?, ?, ?)
      `).run(id, ticketId, userId, input.body, input.attachmentUrl ?? null, timestamp);
      this.database.prepare('UPDATE support_tickets SET updated_at = ? WHERE id = ?').run(timestamp, ticketId);
      this.writeAudit(userId, 'support_message.created', 'support_ticket', ticketId, { messageId: id });
      return this.getSupportTicket(userId, ticketId);
    })();
  }

  getProfile(userId: string) {
    const row = this.database.prepare(`
      SELECT id, public_id, phone, email, name, role, status, created_at, updated_at
      FROM users WHERE id = ?
    `).get(userId) as UserProfileRow | undefined;
    if (!row) throw new UserFeatureError('user_not_found', 'Không tìm thấy tài khoản.', 404);
    return toProfile(row);
  }

  updateProfile(userId: string, patch: ProfilePatch) {
    const current = this.getProfile(userId);
    const nextName = patch.name ?? current.name;
    const nextEmail = patch.email === undefined ? current.email : patch.email;
    const timestamp = this.timestamp();
    try {
      this.database.prepare('UPDATE users SET name = ?, email = ?, updated_at = ? WHERE id = ?')
        .run(nextName, nextEmail, timestamp, userId);
    } catch (error) {
      if (isUniqueConstraint(error)) throw new UserFeatureError('email_already_used', 'Email đã được sử dụng bởi tài khoản khác.', 409);
      throw error;
    }
    const changedFields = Object.keys(patch);
    this.writeAudit(userId, 'profile.updated', 'user', userId, { changedFields });
    return this.getProfile(userId);
  }

  listActivityLogs(userId: string, pagination: PaginationInput) {
    const rows = this.database.prepare(`
      SELECT id, action, target_type, target_id, metadata_json, created_at
      FROM audit_logs WHERE actor_user_id = ?
      ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?
    `).all(userId, pagination.limit, pagination.offset) as Array<{
      id: string; action: string; target_type: string; target_id: string; metadata_json: string | null; created_at: string;
    }>;
    const total = (this.database.prepare('SELECT count(*) AS count FROM audit_logs WHERE actor_user_id = ?')
      .get(userId) as { count: number }).count;
    return {
      items: rows.map((row) => ({
        id: row.id,
        action: row.action,
        targetType: row.target_type,
        targetId: row.target_id,
        metadata: parseJsonObject(row.metadata_json),
        createdAt: row.created_at,
      })),
      total,
      ...pagination,
    };
  }

  private assertOwnedOrder(userId: string, orderId: string): void {
    const owned = this.database.prepare(`
      SELECT 1 FROM orders o INNER JOIN conversions c ON c.id = o.conversion_id
      WHERE o.id = ? AND c.user_id = ?
    `).get(orderId, userId);
    if (!owned) throw new UserFeatureError('order_not_found', 'Không tìm thấy đơn hàng thuộc tài khoản.', 404);
  }

  private writeAudit(
    actorUserId: string,
    action: string,
    targetType: string,
    targetId: string,
    metadata?: Record<string, unknown>,
  ): void {
    this.database.prepare(`
      INSERT INTO audit_logs(id, actor_user_id, action, target_type, target_id, metadata_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      this.generateId('audit'), actorUserId, action, targetType, targetId,
      metadata ? JSON.stringify(metadata) : null, this.timestamp(),
    );
  }

  private timestamp(): string {
    const value = this.now();
    return Number.isNaN(value.getTime()) ? nowIso() : value.toISOString();
  }
}
