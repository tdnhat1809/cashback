import type { SqliteDatabase } from '../../db/database.js';

export interface LedgerInvariantViolation {
  code: 'journal_posting_count' | 'journal_not_balanced' | 'bucket_balance_mismatch' | 'negative_bucket_balance';
  message: string;
  journalId?: string;
  walletAccountId?: string;
  bucket?: string;
  expected?: number;
  actual?: number;
}

export interface LedgerInvariantReport {
  valid: boolean;
  violations: readonly LedgerInvariantViolation[];
}

interface JournalRow {
  id: string;
  posting_count: number;
  amount_vnd: number;
}

interface BucketRow {
  wallet_account_id: string;
  bucket: string;
  balance_vnd: number;
  posted_balance_vnd: number;
}

/**
 * Verifies operational double-entry records against materialized wallet bucket
 * balances. It only reads state, so it is safe for tests, diagnostics, and
 * future operational checks. The pre-existing synthetic clearing opening
 * balance is excluded from the two-posting rule because it has no external
 * equity account in the current schema; its bucket is still reconciled.
 */
export const verifyLedgerInvariants = (database: SqliteDatabase): LedgerInvariantReport => {
  const violations: LedgerInvariantViolation[] = [];
  const journals = database.prepare(`
    SELECT j.id, COUNT(p.id) AS posting_count, COALESCE(SUM(p.amount_vnd), 0) AS amount_vnd
    FROM wallet_journals j
    LEFT JOIN wallet_postings p ON p.journal_id = j.id
    WHERE j.reference_type <> 'system_opening_balance'
    GROUP BY j.id
  `).all() as JournalRow[];

  for (const journal of journals) {
    if (journal.posting_count !== 2) {
      violations.push({
        code: 'journal_posting_count',
        journalId: journal.id,
        expected: 2,
        actual: journal.posting_count,
        message: `Journal ${journal.id} must have exactly two postings.`,
      });
    }
    if (journal.amount_vnd !== 0) {
      violations.push({
        code: 'journal_not_balanced',
        journalId: journal.id,
        expected: 0,
        actual: journal.amount_vnd,
        message: `Journal ${journal.id} postings must sum to zero.`,
      });
    }
  }

  const buckets = database.prepare(`
    SELECT b.wallet_account_id, b.bucket, b.balance_vnd, COALESCE(SUM(p.amount_vnd), 0) AS posted_balance_vnd
    FROM wallet_buckets b
    LEFT JOIN wallet_postings p
      ON p.wallet_account_id = b.wallet_account_id AND p.bucket = b.bucket
    GROUP BY b.wallet_account_id, b.bucket
  `).all() as BucketRow[];

  for (const bucket of buckets) {
    if (bucket.balance_vnd < 0) {
      violations.push({
        code: 'negative_bucket_balance',
        walletAccountId: bucket.wallet_account_id,
        bucket: bucket.bucket,
        actual: bucket.balance_vnd,
        message: `Materialized ${bucket.bucket} balance is negative.`,
      });
    }
    if (bucket.balance_vnd !== bucket.posted_balance_vnd) {
      violations.push({
        code: 'bucket_balance_mismatch',
        walletAccountId: bucket.wallet_account_id,
        bucket: bucket.bucket,
        expected: bucket.posted_balance_vnd,
        actual: bucket.balance_vnd,
        message: `Materialized ${bucket.bucket} balance does not match postings.`,
      });
    }
  }

  return { valid: violations.length === 0, violations };
};

export const assertLedgerInvariants = (database: SqliteDatabase): void => {
  const report = verifyLedgerInvariants(database);
  if (!report.valid) {
    throw new Error(`Ledger invariant violation: ${report.violations.map((violation) => violation.message).join(' ')}`);
  }
};
