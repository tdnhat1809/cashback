import cookieParser from 'cookie-parser';
import express, { type NextFunction, type Request, type Response } from 'express';
import request, { type Agent } from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openDatabase, type SqliteDatabase } from '../src/db/database.js';
import { seedDatabase } from '../src/db/seed.js';
import { AuthService, authErrorHandler, createAuthRouter } from '../src/modules/auth/index.js';
import { createUserFeaturesRouter, UserFeaturesService } from '../src/modules/user-features/index.js';

const fixedNow = new Date('2026-07-10T10:00:00.000Z');

interface TestContext {
  app: express.Express;
  database: SqliteDatabase;
}

let context: TestContext;

beforeEach(() => {
  const database = openDatabase(':memory:');
  seedDatabase(database);
  let sequence = 0;
  const auth = new AuthService({
    database,
    environment: 'development',
    devOtp: '123456',
    sessionTtlHours: 24,
    now: () => fixedNow,
  });
  const features = new UserFeaturesService({
    database,
    now: () => fixedNow,
    generateId: (prefix) => `${prefix}_test_${++sequence}`,
  });
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/auth', createAuthRouter({
    service: auth,
    cookieName: 'test_session',
    environment: 'development',
    sessionTtlHours: 24,
  }));
  app.use('/api/v1', createUserFeaturesRouter({ service: features, auth, cookieName: 'test_session' }));
  app.use(authErrorHandler);
  app.use((_error: unknown, _request: Request, response: Response, _next: NextFunction) => {
    response.status(500).json({ error: { code: 'internal_error' } });
  });
  context = { app, database };
});

afterEach(() => {
  context.database.close();
});

const login = async (phone: string): Promise<{ agent: Agent; userId: string }> => {
  const agent = request.agent(context.app);
  const otp = await agent.post('/auth/otp/request').send({ phone }).expect(201);
  await agent.post('/auth/otp/verify').send({
    challengeId: otp.body.data.challengeId,
    phone,
    code: '123456',
  }).expect(200);
  const me = await agent.get('/auth/me').expect(200);
  return { agent, userId: me.body.data.user.id as string };
};

describe('user feature HTTP modules', () => {
  it('requires a valid session and isolates saved products by user', async () => {
    await request(context.app).get('/api/v1/saved-products').expect(401);
    const first = await login('0912345678');
    const second = await login('0987654321');

    const created = await first.agent.post('/api/v1/saved-products')
      .send({ productId: 'seed_shopee_headphones' }).expect(201);
    expect(created.body.data).toMatchObject({ saved: true, created: true });
    await first.agent.post('/api/v1/saved-products')
      .send({ productId: 'seed_shopee_headphones' }).expect(200)
      .expect(({ body }) => expect(body.data.created).toBe(false));
    await second.agent.post('/api/v1/saved-products')
      .send({ productId: 'seed_shopee_charger' }).expect(201);

    const firstList = await first.agent.get('/api/v1/saved-products').expect(200);
    expect(firstList.body.data.items.map((item: { id: string }) => item.id)).toEqual(['seed_shopee_headphones']);
    expect(firstList.body.data.total).toBe(1);

    await first.agent.post('/api/v1/saved-products/seed_shopee_headphones/toggle').expect(200)
      .expect(({ body }) => expect(body.data.saved).toBe(false));
    await first.agent.get('/api/v1/saved-products').expect(200)
      .expect(({ body }) => expect(body.data.total).toBe(0));
    await second.agent.get('/api/v1/saved-products').expect(200)
      .expect(({ body }) => expect(body.data.items[0].id).toBe('seed_shopee_charger'));
  });

  it('lists only owned notifications, marks them read, and stores preferences', async () => {
    const first = await login('0912345678');
    const second = await login('0987654321');
    const timestamp = fixedNow.toISOString();
    const insert = context.database.prepare(`
      INSERT INTO notifications(id, user_id, type, title, body, created_at) VALUES (?, ?, ?, ?, ?, ?)
    `);
    insert.run('notice_first_1', first.userId, 'cashback', 'Hoàn tiền', 'Đơn hàng đã ghi nhận', timestamp);
    insert.run('notice_first_2', first.userId, 'shipment', 'Vận chuyển', 'Đang giao hàng', timestamp);
    insert.run('notice_second', second.userId, 'system', 'Riêng tư', 'Không được lộ', timestamp);

    const unread = await first.agent.get('/api/v1/notifications?unreadOnly=true').expect(200);
    expect(unread.body.data.items).toHaveLength(2);
    expect(unread.body.data.unread).toBe(2);
    await first.agent.patch('/api/v1/notifications/notice_second/read').expect(404);
    await first.agent.patch('/api/v1/notifications/notice_first_1/read').expect(200)
      .expect(({ body }) => expect(body.data.readAt).toBe(timestamp));
    await first.agent.patch('/api/v1/notifications/read-all').expect(200)
      .expect(({ body }) => expect(body.data.updated).toBe(1));

    const defaults = await first.agent.get('/api/v1/notifications/preferences').expect(200);
    expect(defaults.body.data).toMatchObject({ inApp: true, push: false, shipmentUpdates: true });
    await first.agent.patch('/api/v1/notifications/preferences')
      .send({ push: true, promotions: true }).expect(200)
      .expect(({ body }) => expect(body.data).toMatchObject({ push: true, promotions: true, cashbackUpdates: true }));
  });

  it('redeems point giftcodes exactly once and never credits wallet giftcodes', async () => {
    const first = await login('0912345678');
    const second = await login('0987654321');
    context.database.prepare(`
      INSERT INTO giftcodes(id, code, reward_type, reward_amount, usage_limit, used_count, starts_at, expires_at, active, created_at)
      VALUES ('gift_points_100', 'POINT100', 'points', 100, 1, 0, '2026-01-01T00:00:00.000Z', '2027-01-01T00:00:00.000Z', 1, ?)
    `).run(fixedNow.toISOString());
    context.database.prepare(`
      INSERT INTO giftcodes(id, code, reward_type, reward_amount, usage_limit, used_count, starts_at, expires_at, active, created_at)
      VALUES ('gift_wallet_test', 'WALLET100', 'wallet', 100000, 10, 0, '2026-01-01T00:00:00.000Z', '2027-01-01T00:00:00.000Z', 1, ?)
    `).run(fixedNow.toISOString());

    await first.agent.post('/api/v1/giftcodes/redeem').send({ code: 'point100' }).expect(201)
      .expect(({ body }) => expect(body.data).toMatchObject({ points: 100, balance: 100, alreadyRedeemed: false }));
    await first.agent.post('/api/v1/giftcodes/redeem').send({ code: 'POINT100' }).expect(200)
      .expect(({ body }) => expect(body.data).toMatchObject({ balance: 100, alreadyRedeemed: true }));
    await second.agent.post('/api/v1/giftcodes/redeem').send({ code: 'POINT100' }).expect(409)
      .expect(({ body }) => expect(body.error.code).toBe('giftcode_exhausted'));
    await first.agent.post('/api/v1/giftcodes/redeem').send({ code: 'WALLET100' }).expect(422)
      .expect(({ body }) => expect(body.error.code).toBe('giftcode_cash_disabled'));

    const points = await first.agent.get('/api/v1/points').expect(200);
    expect(points.body.data.balance).toBe(100);
    expect(points.body.data.entries).toHaveLength(1);
    expect((context.database.prepare('SELECT used_count FROM giftcodes WHERE id = ?').get('gift_points_100') as { used_count: number }).used_count).toBe(1);
    expect((context.database.prepare('SELECT count(*) AS count FROM point_ledger_entries').get() as { count: number }).count).toBe(1);
  });

  it('returns referral summary and keeps support tickets private to their owner', async () => {
    const first = await login('0912345678');
    const second = await login('0987654321');
    context.database.prepare(`
      INSERT INTO referrals(id, referrer_user_id, referred_user_id, status, created_at)
      VALUES ('ref_test', ?, ?, 'qualified', ?)
    `).run(first.userId, second.userId, fixedNow.toISOString());

    const referrals = await first.agent.get('/api/v1/referrals/summary').expect(200);
    expect(referrals.body.data.counts).toMatchObject({ total: 1, qualified: 1 });
    expect(referrals.body.data.items[0].referredUser.publicId).toBeTruthy();

    const created = await first.agent.post('/api/v1/support/tickets').send({
      subject: 'Thiếu hoàn tiền Shopee',
      category: 'cashback',
      priority: 'high',
      message: 'Nhờ kiểm tra giúp đơn hàng.',
    }).expect(201);
    const ticketId = created.body.data.id as string;
    expect(created.body.data.messages).toHaveLength(1);
    await first.agent.post(`/api/v1/support/tickets/${ticketId}/messages`)
      .send({ body: 'Tôi gửi thêm thông tin.' }).expect(201)
      .expect(({ body }) => expect(body.data.messages).toHaveLength(2));
    await second.agent.get(`/api/v1/support/tickets/${ticketId}`).expect(404);
    await second.agent.post(`/api/v1/support/tickets/${ticketId}/messages`)
      .send({ body: 'Không được ghi vào ticket này.' }).expect(404);
    await first.agent.get('/api/v1/support/tickets').expect(200)
      .expect(({ body }) => expect(body.data.items[0].messageCount).toBe(2));
  });

  it('updates profile safely and exposes only the current user activity log', async () => {
    const first = await login('0912345678');
    const second = await login('0987654321');
    await second.agent.patch('/api/v1/profile').send({ email: 'used@example.com' }).expect(200);
    await first.agent.patch('/api/v1/profile').send({ name: 'Nguyễn Văn A', email: 'a@example.com' }).expect(200)
      .expect(({ body }) => expect(body.data).toMatchObject({ name: 'Nguyễn Văn A', email: 'a@example.com' }));
    await first.agent.patch('/api/v1/profile').send({ email: 'USED@example.com' }).expect(409)
      .expect(({ body }) => expect(body.error.code).toBe('email_already_used'));

    const activity = await first.agent.get('/api/v1/activity-logs').expect(200);
    expect(activity.body.data.items.some((entry: { action: string }) => entry.action === 'profile.updated')).toBe(true);
    const actors = context.database.prepare('SELECT DISTINCT actor_user_id FROM audit_logs WHERE actor_user_id = ?').all(first.userId);
    expect(actors).toHaveLength(1);
  });
});
