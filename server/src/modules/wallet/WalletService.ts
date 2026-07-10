import type { SqliteDatabase } from '../../db/database.js';
import { createId, nowIso } from '../../lib/ids.js';
import { encryptString, maskBankAccount } from '../../lib/security.js';

export type WalletBucket = 'pending' | 'available' | 'reserved' | 'withdrawn';

export interface WalletBalances {
  pending: number;
  available: number;
  reserved: number;
  withdrawn: number;
}

interface BucketRow { bucket: WalletBucket; balance_vnd: number }

export class WalletError extends Error {
  constructor(message: string, readonly code: string, readonly status = 400) { super(message); }
}

export class WalletService {
  constructor(private readonly database: SqliteDatabase, private readonly encryptionKey: string) {}

  ensureWallet(userId: string) {
    const existing = this.database.prepare('SELECT id FROM wallet_accounts WHERE user_id = ?').get(userId) as { id: string } | undefined;
    if (existing) return existing.id;
    const walletId = createId('wallet');
    const timestamp = nowIso();
    this.database.transaction(() => {
      this.database.prepare('INSERT INTO wallet_accounts(id, user_id, currency, created_at) VALUES (?, ?, ?, ?)').run(walletId, userId, 'VND', timestamp);
      for (const bucket of ['pending', 'available', 'reserved', 'withdrawn'] as const) {
        this.database.prepare('INSERT INTO wallet_buckets(wallet_account_id, bucket, balance_vnd, updated_at) VALUES (?, ?, 0, ?)').run(walletId, bucket, timestamp);
      }
      this.database.prepare('INSERT INTO point_accounts(id, user_id, balance, updated_at) VALUES (?, ?, 0, ?)').run(createId('points'), userId, timestamp);
    })();
    return walletId;
  }

  getBalances(userId: string): WalletBalances {
    const walletId = this.ensureWallet(userId);
    const balances: WalletBalances = { pending: 0, available: 0, reserved: 0, withdrawn: 0 };
    for (const row of this.database.prepare('SELECT bucket, balance_vnd FROM wallet_buckets WHERE wallet_account_id = ?').all(walletId) as BucketRow[]) {
      balances[row.bucket] = row.balance_vnd;
    }
    return balances;
  }

  requestWithdrawal(input: {
    userId: string;
    amountVnd: number;
    idempotencyKey: string;
    bankName: string;
    bankAccountNumber: string;
    accountName: string;
  }) {
    if (!Number.isSafeInteger(input.amountVnd) || input.amountVnd < 50_000) throw new WalletError('Số tiền rút tối thiểu là 50.000đ.', 'withdrawal_amount_invalid', 422);
    if (!/^[A-Za-z0-9_-]{8,128}$/.test(input.idempotencyKey)) throw new WalletError('Idempotency-Key không hợp lệ.', 'idempotency_key_invalid', 422);
    if (!/^\d{6,20}$/.test(input.bankAccountNumber)) throw new WalletError('Số tài khoản ngân hàng không hợp lệ.', 'bank_account_invalid', 422);
    const existing = this.database.prepare('SELECT * FROM withdrawal_requests WHERE user_id = ? AND idempotency_key = ?').get(input.userId, input.idempotencyKey);
    if (existing) return existing;

    const walletId = this.ensureWallet(input.userId);
    const timestamp = nowIso();
    const withdrawalId = createId('withdrawal');
    const journalId = createId('journal');
    return this.database.transaction(() => {
      const available = this.database.prepare(`SELECT balance_vnd FROM wallet_buckets WHERE wallet_account_id = ? AND bucket = 'available'`).get(walletId) as { balance_vnd: number };
      if (available.balance_vnd < input.amountVnd) throw new WalletError('Số dư khả dụng không đủ.', 'insufficient_available_balance', 409);
      this.database.prepare(`UPDATE wallet_buckets SET balance_vnd = balance_vnd - ?, updated_at = ? WHERE wallet_account_id = ? AND bucket = 'available'`).run(input.amountVnd, timestamp, walletId);
      this.database.prepare(`UPDATE wallet_buckets SET balance_vnd = balance_vnd + ?, updated_at = ? WHERE wallet_account_id = ? AND bucket = 'reserved'`).run(input.amountVnd, timestamp, walletId);
      this.database.prepare(`INSERT INTO wallet_journals(id, idempotency_key, reference_type, reference_id, description, created_at) VALUES (?, ?, 'withdrawal', ?, ?, ?)`).run(journalId, `withdrawal:reserve:${input.idempotencyKey}`, withdrawalId, `Giữ tiền cho yêu cầu rút ${withdrawalId}`, timestamp);
      const posting = this.database.prepare(`INSERT INTO wallet_postings(id, journal_id, wallet_account_id, bucket, amount_vnd, created_at) VALUES (?, ?, ?, ?, ?, ?)`);
      posting.run(createId('posting'), journalId, walletId, 'available', -input.amountVnd, timestamp);
      posting.run(createId('posting'), journalId, walletId, 'reserved', input.amountVnd, timestamp);
      this.database.prepare(`
        INSERT INTO withdrawal_requests(
          id, user_id, amount_vnd, bank_name, bank_account_masked, bank_account_ciphertext,
          account_name, status, created_at, updated_at, idempotency_key, fee_vnd, net_amount_vnd
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, 0, ?)
      `).run(
        withdrawalId, input.userId, input.amountVnd, input.bankName,
        maskBankAccount(input.bankAccountNumber), encryptString(input.bankAccountNumber, this.encryptionKey),
        input.accountName, timestamp, timestamp, input.idempotencyKey, input.amountVnd,
      );
      return this.database.prepare('SELECT * FROM withdrawal_requests WHERE id = ?').get(withdrawalId);
    })();
  }

  listWithdrawals(userId: string) {
    return this.database.prepare(`
      SELECT id, amount_vnd, fee_vnd, net_amount_vnd, bank_name, bank_account_masked,
             account_name, status, transaction_code, rejection_reason, created_at, updated_at
      FROM withdrawal_requests WHERE user_id = ? ORDER BY created_at DESC
    `).all(userId);
  }
}
