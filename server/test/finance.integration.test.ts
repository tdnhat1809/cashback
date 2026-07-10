import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { openDatabase, type SqliteDatabase } from '../src/db/database.js';

const config = loadConfig({
  NODE_ENV: 'test',
  DATABASE_PATH: ':memory:',
  APP_URL: 'http://localhost:5173',
  API_PUBLIC_URL: 'http://localhost:8787',
  DEV_OTP: '123456',
  SHOPEE_AFFILIATE_MODE: 'dynamic',
  SHOPEE_AFFILIATE_ID: 'affiliate-test',
  DATA_ENCRYPTION_KEY: 'test-encryption-key-that-is-long-enough',
  IP_HASH_PEPPER: 'test-ip-pepper-that-is-long-enough',
});

const databases: SqliteDatabase[] = [];
afterEach(() => { while (databases.length) databases.pop()?.close(); });

const login = async (agent: ReturnType<typeof request.agent>, phone: string) => {
  const challenge = await agent.post('/api/v1/auth/otp/request').send({ phone }).expect(201);
  await agent.post('/api/v1/auth/otp/verify').send({
    challengeId: challenge.body.data.challengeId,
    phone,
    code: '123456',
  }).expect(200);
};

describe('settlement and manual payout operations', () => {
  it('moves only validated Shopee cashback into available balance and pays a reviewed withdrawal once', async () => {
    const database = openDatabase(':memory:');
    databases.push(database);
    const built = createApp(config, { database });
    const customer = request.agent(built.app);
    const admin = request.agent(built.app);
    await login(customer, '0912345678');
    await login(admin, '0900000000');

    const link = await customer.post('/api/v1/affiliate-links').send({
      platform: 'shopee',
      destinationUrl: 'https://shopee.vn/product-i.52377417.6309028319',
    }).expect(201);
    const now = new Date().toISOString();
    const pending = {
      platform: 'shopee', externalValidationId: 'validation-pending-001', observedAt: now,
      grossCommissionVnd: 100000, items: [{
        externalConversionId: 'conversion-001', externalOrderId: 'order-001', externalItemId: 'item-001',
        trackingTag: link.body.data.trackingTag, actualCommissionVnd: 100000, orderValueVnd: 500000,
        stage: 'pending',
      }], rawPayload: { batch: 'pending-001' },
    };
    const importedPending = await admin.post('/api/v1/admin/settlements/import').send(pending).expect(201);
    expect(importedPending.body.data.cashbackVnd).toBe(90000);
    expect((await customer.get('/api/v1/dashboard').expect(200)).body.data.wallet).toMatchObject({
      pending: 90000, available: 0,
    });

    const validated = {
      ...pending,
      externalValidationId: 'validation-validated-001',
      items: [{ ...pending.items[0], stage: 'validated' }],
      rawPayload: { batch: 'validated-001' },
    };
    await admin.post('/api/v1/admin/settlements/import').send(validated).expect(201);
    const afterValidation = await customer.get('/api/v1/dashboard').expect(200);
    expect(afterValidation.body.data.wallet).toMatchObject({ pending: 0, available: 90000 });
    await admin.post('/api/v1/admin/settlements/import').send(validated).expect(201);
    expect((await customer.get('/api/v1/dashboard').expect(200)).body.data.wallet.available).toBe(90000);

    const withdrawal = await customer.post('/api/v1/withdrawals')
      .set('Idempotency-Key', 'withdrawal_finance_001')
      .send({ amountVnd: 50000, bankName: 'Techcombank', bankAccountNumber: '19034298104321', accountName: 'NGUYEN VAN A' })
      .expect(201);
    const withdrawalId = withdrawal.body.data.id as string;
    await admin.post(`/api/v1/admin/withdrawals/${withdrawalId}/approve`)
      .set('Idempotency-Key', 'admin_approve_001').expect(200);
    await admin.post(`/api/v1/admin/withdrawals/${withdrawalId}/mark-paid`)
      .set('Idempotency-Key', 'admin_paid_001').send({ transactionCode: 'BANK-2026-001' }).expect(200);
    await admin.post(`/api/v1/admin/withdrawals/${withdrawalId}/mark-paid`)
      .set('Idempotency-Key', 'admin_paid_001').send({ transactionCode: 'BANK-2026-001' }).expect(200);
    expect((await customer.get('/api/v1/dashboard').expect(200)).body.data.wallet).toMatchObject({
      available: 40000, reserved: 0, withdrawn: 50000,
    });
  });
});
