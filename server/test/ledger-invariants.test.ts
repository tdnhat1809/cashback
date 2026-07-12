import { afterEach, describe, expect, it } from 'vitest';
import { openDatabase, type SqliteDatabase } from '../src/db/database.js';
import { nowIso } from '../src/lib/ids.js';
import { ensureSettlementClearingWallet, postWalletTransfer } from '../src/modules/finance/accounting.js';
import { assertLedgerInvariants, verifyLedgerInvariants } from '../src/modules/finance/ledger-invariants.js';
import { WalletService } from '../src/modules/wallet/WalletService.js';

const databases: SqliteDatabase[] = [];
afterEach(() => { while (databases.length) databases.pop()?.close(); });

const addUser = (database: SqliteDatabase, id: string) => {
  const timestamp = nowIso();
  database.prepare(`
    INSERT INTO users(id, public_id, phone, name, role, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'user', 'active', ?, ?)
  `).run(id, `PUBLIC_${id}`, `+8490000${id.slice(-4)}`, `User ${id}`, timestamp, timestamp);
};

describe('wallet ledger invariants', () => {
  it('keeps withdrawal journals scoped to the same user-level idempotency boundary', () => {
    const database = openDatabase(':memory:');
    databases.push(database);
    addUser(database, 'user_0001');
    addUser(database, 'user_0002');
    const wallets = new WalletService(database, 'test-encryption-key-that-is-long-enough');
    const clearingWalletId = ensureSettlementClearingWallet(database);
    const firstWalletId = wallets.ensureWallet('user_0001');
    const secondWalletId = wallets.ensureWallet('user_0002');
    const timestamp = nowIso();

    for (const [walletId, key] of [[firstWalletId, 'fund_user_0001'], [secondWalletId, 'fund_user_0002']] as const) {
      postWalletTransfer(database, {
        fromWalletAccountId: clearingWalletId,
        fromBucket: 'available',
        toWalletAccountId: walletId,
        toBucket: 'available',
        amountVnd: 100_000,
        idempotencyKey: key,
        referenceType: 'test_funding',
        referenceId: walletId,
        description: 'Fund test wallet',
        createdAt: timestamp,
      });
    }

    const sameUserScopedKey = 'shared_key_001';
    const first = wallets.requestWithdrawal({
      userId: 'user_0001', amountVnd: 50_000, idempotencyKey: sameUserScopedKey,
      bankName: 'Test Bank', bankAccountNumber: '190000000001', accountName: 'FIRST USER',
    });
    const second = wallets.requestWithdrawal({
      userId: 'user_0002', amountVnd: 50_000, idempotencyKey: sameUserScopedKey,
      bankName: 'Test Bank', bankAccountNumber: '190000000002', accountName: 'SECOND USER',
    });

    expect(first).toMatchObject({ status: 'pending' });
    expect(second).toMatchObject({ status: 'pending' });
    expect(database.prepare(`
      SELECT idempotency_key FROM wallet_journals WHERE reference_type = 'withdrawal' ORDER BY idempotency_key
    `).all()).toEqual([
      { idempotency_key: 'withdrawal:reserve:user_0001:shared_key_001' },
      { idempotency_key: 'withdrawal:reserve:user_0002:shared_key_001' },
    ]);
    expect(verifyLedgerInvariants(database)).toEqual({ valid: true, violations: [] });
    expect(() => assertLedgerInvariants(database)).not.toThrow();
  });

  it('reports materialized balances that diverge from immutable postings', () => {
    const database = openDatabase(':memory:');
    databases.push(database);
    addUser(database, 'user_0003');
    const wallets = new WalletService(database, 'test-encryption-key-that-is-long-enough');
    const walletId = wallets.ensureWallet('user_0003');
    database.prepare(`
      UPDATE wallet_buckets SET balance_vnd = 1 WHERE wallet_account_id = ? AND bucket = 'available'
    `).run(walletId);

    const report = verifyLedgerInvariants(database);
    expect(report.valid).toBe(false);
    expect(report.violations).toContainEqual(expect.objectContaining({
      code: 'bucket_balance_mismatch', walletAccountId: walletId, bucket: 'available', expected: 0, actual: 1,
    }));
  });
});
