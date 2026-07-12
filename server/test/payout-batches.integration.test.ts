import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { DeterministicMockPayoutGateway } from '../src/modules/finance/DeterministicMockPayoutGateway.js';
import { migrateDatabase, openDatabase, type SqliteDatabase } from '../src/db/database.js';

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

const register = async (agent: ReturnType<typeof request.agent>, email: string) => {
  await agent.post('/api/v1/auth/register').send({
    name: 'Payout test user', email, password: 'Password1234',
  }).expect(201);
};

describe('offline payout batches', () => {
  it('applies the append-only offline payout migration to an existing database', () => {
    const database = openDatabase(':memory:');
    databases.push(database);
    database.exec('DROP TABLE payout_batch_items; DROP TABLE payout_batches; DELETE FROM schema_migrations WHERE version = 7;');
    migrateDatabase(database);
    expect(database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'payout_batches'").get()).toBeDefined();
    expect(database.prepare('SELECT version FROM schema_migrations WHERE version = 7').get()).toEqual({ version: 7 });
  });

  it('returns reproducible, explicitly non-bank mock receipts', () => {
    const gateway = new DeterministicMockPayoutGateway();
    const instruction = {
      batchId: 'payout_batch_test', batchReference: 'OFFLINE-MOCK-TEST', itemId: 'payout_item_test',
      withdrawalRequestId: 'withdrawal_test', amountVnd: 50000,
    };
    const first = gateway.submit(instruction);
    expect(gateway.submit(instruction)).toEqual(first);
    expect(gateway.reconcile(instruction, first.reference)).toEqual(first);
    expect(first).toMatchObject({ gateway: 'deterministic_mock', status: 'accepted', realBankActivity: false });
  });

  it('uses a distinct maker/checker and reconciles deterministic mock receipts without recording a bank payment', async () => {
    const database = openDatabase(':memory:');
    databases.push(database);
    const built = createApp(config, { database });
    const customer = request.agent(built.app);
    const maker = request.agent(built.app);
    const checker = request.agent(built.app);
    const admin = request.agent(built.app);

    await register(customer, 'payout-customer@example.com');
    await register(maker, 'payout-maker@example.com');
    await register(checker, 'payout-checker@example.com');
    database.prepare("UPDATE users SET role = 'finance' WHERE email IN (?, ?)")
      .run('payout-maker@example.com', 'payout-checker@example.com');
    await admin.post('/api/v1/auth/login').send({ email: 'admin@hoantienvip.local', password: 'ChangeMe123!' }).expect(200);

    const customerUser = (await customer.get('/api/v1/auth/me').expect(200)).body.data.user as { id: string };
    await customer.get('/api/v1/dashboard').expect(200);
    const wallet = database.prepare('SELECT id FROM wallet_accounts WHERE user_id = ?').get(customerUser.id) as { id: string };
    database.prepare("UPDATE wallet_buckets SET balance_vnd = 100000 WHERE wallet_account_id = ? AND bucket = 'available'")
      .run(wallet.id);
    const withdrawal = await customer.post('/api/v1/withdrawals')
      .set('Idempotency-Key', 'payout_withdrawal_001')
      .send({ amountVnd: 50000, bankName: 'Techcombank', bankAccountNumber: '19034298104321', accountName: 'NGUYEN VAN A' })
      .expect(201);
    const withdrawalId = withdrawal.body.data.id as string;
    await admin.post(`/api/v1/admin/withdrawals/${withdrawalId}/approve`)
      .set('Idempotency-Key', 'payout_withdrawal_approve_001').expect(200);

    const createPayload = { withdrawalIds: [withdrawalId], memo: 'Offline mock batch' };
    const created = await maker.post('/api/v1/admin/payout-batches')
      .set('Idempotency-Key', 'payout_batch_create_001').send(createPayload).expect(201);
    const batchId = created.body.data.id as string;
    expect(created.body.data).toMatchObject({ status: 'draft', gateway_mode: 'deterministic_mock' });
    expect(created.body.data.safety).toEqual({
      gatewayMode: 'deterministic_mock', realBankActivity: false, withdrawalStateChanged: false,
    });
    expect(created.body.data.items[0]).toMatchObject({ withdrawal_request_id: withdrawalId, status: 'queued' });

    const replayedCreate = await maker.post('/api/v1/admin/payout-batches')
      .set('Idempotency-Key', 'payout_batch_create_001').send(createPayload).expect(201);
    expect(replayedCreate.body.data.id).toBe(batchId);
    await maker.post('/api/v1/admin/payout-batches')
      .set('Idempotency-Key', 'payout_batch_create_001').send({ ...createPayload, memo: 'Different request' })
      .expect(409);
    await maker.post(`/api/v1/admin/payout-batches/${batchId}/approve`)
      .set('Idempotency-Key', 'payout_batch_maker_approve_001').expect(409);

    const approved = await checker.post(`/api/v1/admin/payout-batches/${batchId}/approve`)
      .set('Idempotency-Key', 'payout_batch_checker_approve_001').expect(200);
    expect(approved.body.data).toMatchObject({ status: 'approved' });
    await maker.post(`/api/v1/admin/payout-batches/${batchId}/submit-mock`)
      .set('Idempotency-Key', 'payout_batch_maker_submit_001').expect(403);

    const submitted = await checker.post(`/api/v1/admin/payout-batches/${batchId}/submit-mock`)
      .set('Idempotency-Key', 'payout_batch_checker_submit_001').expect(200);
    expect(submitted.body.data).toMatchObject({ status: 'mock_submitted' });
    expect(submitted.body.data.items[0]).toMatchObject({
      status: 'mock_submitted', mock_gateway_status: 'accepted',
    });
    expect(submitted.body.data.items[0].mock_gateway_reference).toMatch(/^MOCK-PAYOUT-[A-F0-9]{20}$/);

    const reconciled = await checker.post(`/api/v1/admin/payout-batches/${batchId}/reconcile-mock`)
      .set('Idempotency-Key', 'payout_batch_checker_reconcile_001').expect(200);
    expect(reconciled.body.data).toMatchObject({ status: 'reconciled' });
    expect(reconciled.body.data.items[0]).toMatchObject({
      status: 'reconciled_mock', reconciliation_status: 'matched_mock',
    });
    expect(reconciled.body.data.reconciliation_summary).toMatchObject({
      matchedMockCount: 1, realBankActivity: false,
    });

    const withdrawalAfter = database.prepare(`
      SELECT status, transaction_code FROM withdrawal_requests WHERE id = ?
    `).get(withdrawalId) as { status: string; transaction_code: string | null };
    expect(withdrawalAfter).toEqual({ status: 'approved', transaction_code: null });
    const balances = await customer.get('/api/v1/dashboard').expect(200);
    expect(balances.body.data.wallet).toMatchObject({ available: 50000, reserved: 50000, withdrawn: 0 });
    expect((database.prepare("SELECT count(*) AS count FROM audit_logs WHERE target_type = 'payout_batch'").get() as { count: number }).count)
      .toBe(4);
  });
});
