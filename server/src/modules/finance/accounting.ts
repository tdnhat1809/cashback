import type { SqliteDatabase } from '../../db/database.js';
import { createId, nowIso } from '../../lib/ids.js';
import type { WalletBucket } from '../wallet/WalletService.js';

const CLEARING_USER_ID = 'system_settlement_clearing_user';
const CLEARING_WALLET_ID = 'system_settlement_clearing_wallet';
const OPENING_BALANCE_VND = 4_000_000_000_000_000;

interface BalanceRow { balance_vnd: number }

export class AccountingError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status = 409,
  ) {
    super(message);
    this.name = 'AccountingError';
  }
}

export interface TransferInput {
  fromWalletAccountId: string;
  fromBucket: WalletBucket;
  toWalletAccountId: string;
  toBucket: WalletBucket;
  amountVnd: number;
  idempotencyKey: string;
  referenceType: string;
  referenceId: string;
  description: string;
  policyVersion?: string;
  createdAt?: string;
}

export const ensureSettlementClearingWallet = (database: SqliteDatabase): string => {
  const timestamp = nowIso();
  database.prepare(`
    INSERT OR IGNORE INTO users(id, public_id, phone, name, role, status, created_at, updated_at)
    VALUES (?, 'SYSTEM_CLEARING', '+84999999998', 'Settlement clearing', 'admin', 'suspended', ?, ?)
  `).run(CLEARING_USER_ID, timestamp, timestamp);
  database.prepare(`
    INSERT OR IGNORE INTO wallet_accounts(id, user_id, currency, created_at)
    VALUES (?, ?, 'VND', ?)
  `).run(CLEARING_WALLET_ID, CLEARING_USER_ID, timestamp);
  for (const bucket of ['pending', 'available', 'reserved', 'withdrawn'] as const) {
    database.prepare(`
      INSERT OR IGNORE INTO wallet_buckets(wallet_account_id, bucket, balance_vnd, updated_at)
      VALUES (?, ?, 0, ?)
    `).run(CLEARING_WALLET_ID, bucket, timestamp);
  }

  const openingKey = 'system:settlement-clearing:opening-v1';
  const opening = database.prepare('SELECT id FROM wallet_journals WHERE idempotency_key = ?').get(openingKey);
  if (!opening) {
    const journalId = createId('journal');
    database.prepare(`
      INSERT INTO wallet_journals(
        id, idempotency_key, reference_type, reference_id, description, created_at
      ) VALUES (?, ?, 'system_opening_balance', ?, 'Opening balance for settlement clearing', ?)
    `).run(journalId, openingKey, CLEARING_WALLET_ID, timestamp);
    database.prepare(`
      INSERT INTO wallet_postings(id, journal_id, wallet_account_id, bucket, amount_vnd, created_at)
      VALUES (?, ?, ?, 'available', ?, ?)
    `).run(createId('posting'), journalId, CLEARING_WALLET_ID, OPENING_BALANCE_VND, timestamp);
    database.prepare(`
      UPDATE wallet_buckets SET balance_vnd = ?, updated_at = ?
      WHERE wallet_account_id = ? AND bucket = 'available'
    `).run(OPENING_BALANCE_VND, timestamp, CLEARING_WALLET_ID);
  }
  return CLEARING_WALLET_ID;
};

const balance = (
  database: SqliteDatabase,
  walletAccountId: string,
  bucket: WalletBucket,
): number => {
  const row = database.prepare(`
    SELECT balance_vnd FROM wallet_buckets WHERE wallet_account_id = ? AND bucket = ?
  `).get(walletAccountId, bucket) as BalanceRow | undefined;
  if (!row) throw new AccountingError('Wallet bucket does not exist.', 'wallet_bucket_not_found', 500);
  return row.balance_vnd;
};

/**
 * Posts an operational journal with exactly one debit and one credit. Bucket
 * balances are materialized for fast reads, while signed postings remain the
 * immutable accounting record.
 */
export const postWalletTransfer = (database: SqliteDatabase, input: TransferInput): string | null => {
  if (!Number.isSafeInteger(input.amountVnd) || input.amountVnd < 0) {
    throw new AccountingError('Transfer amount must be a non-negative safe integer.', 'invalid_transfer_amount', 422);
  }
  if (input.amountVnd === 0) return null;
  if (input.fromWalletAccountId === input.toWalletAccountId && input.fromBucket === input.toBucket) {
    throw new AccountingError('The source and destination buckets must differ.', 'invalid_transfer_accounts', 422);
  }

  const existing = database.prepare('SELECT id FROM wallet_journals WHERE idempotency_key = ?')
    .get(input.idempotencyKey) as { id: string } | undefined;
  if (existing) return existing.id;

  const sourceBalance = balance(database, input.fromWalletAccountId, input.fromBucket);
  if (sourceBalance < input.amountVnd) {
    throw new AccountingError('The source wallet bucket has insufficient funds.', 'insufficient_bucket_balance');
  }

  const timestamp = input.createdAt ?? nowIso();
  const journalId = createId('journal');
  database.prepare(`
    INSERT INTO wallet_journals(
      id, idempotency_key, reference_type, reference_id, description, policy_version, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    journalId,
    input.idempotencyKey,
    input.referenceType,
    input.referenceId,
    input.description,
    input.policyVersion ?? null,
    timestamp,
  );
  const update = database.prepare(`
    UPDATE wallet_buckets SET balance_vnd = balance_vnd + ?, updated_at = ?
    WHERE wallet_account_id = ? AND bucket = ?
  `);
  update.run(-input.amountVnd, timestamp, input.fromWalletAccountId, input.fromBucket);
  update.run(input.amountVnd, timestamp, input.toWalletAccountId, input.toBucket);

  const insertPosting = database.prepare(`
    INSERT INTO wallet_postings(id, journal_id, wallet_account_id, bucket, amount_vnd, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertPosting.run(
    createId('posting'), journalId, input.fromWalletAccountId, input.fromBucket, -input.amountVnd, timestamp,
  );
  insertPosting.run(
    createId('posting'), journalId, input.toWalletAccountId, input.toBucket, input.amountVnd, timestamp,
  );
  return journalId;
};

