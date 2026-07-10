import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { openDatabase, type SqliteDatabase } from '../src/db/database.js';

const config = loadConfig({
  NODE_ENV: 'test', DATABASE_PATH: ':memory:', APP_URL: 'http://localhost:5173', API_PUBLIC_URL: 'http://localhost:8787',
  DEV_OTP: '123456', SHOPEE_AFFILIATE_MODE: 'dynamic', SHOPEE_AFFILIATE_ID: 'affiliate-test',
  DATA_ENCRYPTION_KEY: 'test-encryption-key-that-is-long-enough', IP_HASH_PEPPER: 'test-ip-pepper-that-is-long-enough',
});

const databases: SqliteDatabase[] = [];
afterEach(() => { while (databases.length) databases.pop()?.close(); });

const authenticatedAgent = async () => {
  const database = openDatabase(':memory:');
  databases.push(database);
  const built = createApp(config, { database });
  const agent = request.agent(built.app);
  await agent.post('/api/v1/auth/register').send({
    name: 'Người dùng kiểm thử', email: 'member@example.com', password: 'Password1234',
  }).expect(201);
  const me = await agent.get('/api/v1/auth/me').expect(200);
  return { ...built, agent, user: me.body.data.user as { id: string } };
};

describe('HTTP API integration', () => {
  it('reports health and authenticates using an HttpOnly session cookie', async () => {
    const { app, agent } = await authenticatedAgent();
    const health = await request(app).get('/api/v1/health').expect(200);
    expect(health.body.data.status).toBe('ok');
    const me = await agent.get('/api/v1/auth/me').expect(200);
    expect(me.body.data.user.email).toBe('member@example.com');
  });

  it('creates a Shopee tracking link and records redirect clicks', async () => {
    const { agent, database } = await authenticatedAgent();
    const created = await agent.post('/api/v1/affiliate-links').send({
      platform: 'shopee', destinationUrl: 'https://shopee.vn/product-i.52377417.6309028319',
    }).expect(201);
    expect(created.body.data.redirectUrl).toContain('/r/');
    const redirected = await agent.get(`/r/${created.body.data.token}`).expect(302);
    expect(redirected.headers.location).toContain('https://s.shopee.vn/an_redir');
    const clicks = database.prepare('SELECT count(*) AS count FROM affiliate_clicks').get() as { count: number };
    expect(clicks.count).toBe(1);
  });

  it('reserves available balance idempotently when requesting withdrawal', async () => {
    const { agent, database, user } = await authenticatedAgent();
    await agent.get('/api/v1/dashboard').expect(200);
    const wallet = database.prepare('SELECT id FROM wallet_accounts WHERE user_id = ?').get(user.id) as { id: string };
    database.prepare(`UPDATE wallet_buckets SET balance_vnd = 200000 WHERE wallet_account_id = ? AND bucket = 'available'`).run(wallet.id);
    const payload = { amountVnd: 100000, bankName: 'Techcombank', bankAccountNumber: '19034298104321', accountName: 'NGUYEN VAN A' };
    await agent.post('/api/v1/withdrawals').set('Idempotency-Key', 'withdrawal_test_001').send(payload).expect(201);
    await agent.post('/api/v1/withdrawals').set('Idempotency-Key', 'withdrawal_test_001').send(payload).expect(201);
    const balances = await agent.get('/api/v1/dashboard').expect(200);
    expect(balances.body.data.wallet.available).toBe(100000);
    expect(balances.body.data.wallet.reserved).toBe(100000);
    expect((database.prepare('SELECT count(*) AS count FROM withdrawal_requests').get() as { count: number }).count).toBe(1);
  });

  it('uses an encrypted saved bank account without returning its full account number', async () => {
    const { agent, database, user } = await authenticatedAgent();
    const bank = await agent.put('/api/v1/bank-accounts/default').send({
      bankCode: 'TCB', bankName: 'Techcombank', accountNumber: '19034298104321', accountName: 'NGUYEN VAN A',
    }).expect(200);
    expect(bank.body.data.accountNumberMasked).not.toContain('19034298104321');
    expect(database.prepare('SELECT account_number_ciphertext FROM bank_accounts WHERE id = ?').get(bank.body.data.id))
      .toBeDefined();
    await agent.get('/api/v1/dashboard').expect(200);
    const wallet = database.prepare('SELECT id FROM wallet_accounts WHERE user_id = ?').get(user.id) as { id: string };
    database.prepare(`UPDATE wallet_buckets SET balance_vnd = 100000 WHERE wallet_account_id = ? AND bucket = 'available'`).run(wallet.id);
    const withdrawal = await agent.post('/api/v1/withdrawals').set('Idempotency-Key', 'withdrawal_saved_bank_001')
      .send({ amountVnd: 50000, bankAccountId: bank.body.data.id }).expect(201);
    expect(withdrawal.body.data.bank_account_masked).toBe(bank.body.data.accountNumberMasked);
  });

  it('isolates shipments by authenticated user and rejects duplicates', async () => {
    const { agent } = await authenticatedAgent();
    const shipment = { trackingNumber: 'SPXVN0192837461', carrierCode: 'spx' };
    const created = await agent.post('/api/v1/shipments').send(shipment).expect(201);
    expect(created.body.data.latest_status).toBe('CREATED');
    expect(created.body.data.events).toHaveLength(1);
    await agent.post('/api/v1/shipments').send(shipment).expect(409);
    const list = await agent.get('/api/v1/shipments').expect(200);
    expect(list.body.data).toHaveLength(1);
    const carriers = await agent.get('/api/v1/carriers').expect(200);
    expect(carriers.body.data).toHaveLength(14);
    const synced = await agent.post(`/api/v1/shipments/${created.body.data.id}/sync`).expect(200);
    expect(synced.body.data.latest_status).toBe('PICKED_UP');
    expect(synced.body.meta.payable).toBe(false);
  });
});
