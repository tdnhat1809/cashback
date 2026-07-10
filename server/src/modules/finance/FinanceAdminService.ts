import { createHash } from 'node:crypto';
import type { SqliteDatabase } from '../../db/database.js';
import { createId, nowIso } from '../../lib/ids.js';
import type { AuthUser } from '../auth/service.js';
import { postWalletTransfer } from './accounting.js';

type AdminActor = Pick<AuthUser, 'id' | 'role'>;

interface WithdrawalRow {
  id: string;
  user_id: string;
  amount_vnd: number;
  fee_vnd: number;
  net_amount_vnd: number;
  bank_name: string;
  bank_account_masked: string;
  account_name: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  transaction_code: string | null;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export class FinanceAdminError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status = 409,
    readonly details?: Readonly<Record<string, unknown>>,
  ) {
    super(message);
    this.name = 'FinanceAdminError';
  }
}

const stableJson = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (typeof value === 'object' && value !== null) {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
};

const requestHash = (value: unknown) => createHash('sha256').update(stableJson(value)).digest('hex');

const assertIdempotencyKey = (key: string): void => {
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(key)) {
    throw new FinanceAdminError('A valid Idempotency-Key header is required.', 'idempotency_key_invalid', 422);
  }
};

export class FinanceAdminService {
  constructor(private readonly database: SqliteDatabase) {}

  listSyncRuns(input: { provider?: string; status?: string; limit?: number; offset?: number } = {}) {
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    const offset = Math.max(input.offset ?? 0, 0);
    return this.database.prepare(`
      SELECT id, provider, stream, mode, status, window_start, window_end, page_count,
             record_count, error, started_at, finished_at
      FROM provider_sync_runs
      WHERE (? IS NULL OR provider = ?) AND (? IS NULL OR status = ?)
      ORDER BY started_at DESC LIMIT ? OFFSET ?
    `).all(input.provider ?? null, input.provider ?? null, input.status ?? null, input.status ?? null, limit, offset);
  }

  getSyncRun(id: string) {
    const run = this.database.prepare(`
      SELECT id, provider, stream, mode, status, window_start, window_end, page_count,
             record_count, error, started_at, finished_at
      FROM provider_sync_runs WHERE id = ?
    `).get(id);
    if (!run) throw new FinanceAdminError('Provider sync run was not found.', 'sync_run_not_found', 404);
    const reports = this.database.prepare(`
      SELECT id, platform, external_validation_id, status, gross_commission_vnd,
             tax_withheld_vnd, distributable_net_vnd, observed_at, reconciled_at
      FROM settlement_reports WHERE sync_run_id = ? ORDER BY observed_at DESC
    `).all(id);
    return { ...(run as object), reports };
  }

  listWithdrawals(input: { status?: WithdrawalRow['status']; limit?: number; offset?: number } = {}) {
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    const offset = Math.max(input.offset ?? 0, 0);
    return this.database.prepare(`
      SELECT w.id, w.user_id, u.public_id AS user_public_id, u.name AS user_name,
             w.amount_vnd, w.fee_vnd, w.net_amount_vnd, w.bank_name,
             w.bank_account_masked, w.account_name, w.status, w.transaction_code,
             w.rejection_reason, w.reviewed_by, w.reviewed_at, w.created_at, w.updated_at
      FROM withdrawal_requests w JOIN users u ON u.id = w.user_id
      WHERE (? IS NULL OR w.status = ?)
      ORDER BY w.created_at DESC LIMIT ? OFFSET ?
    `).all(input.status ?? null, input.status ?? null, limit, offset);
  }

  getWithdrawal(id: string) {
    const withdrawal = this.withdrawal(id);
    const auditLogs = this.database.prepare(`
      SELECT id, actor_user_id, action, metadata_json, created_at
      FROM audit_logs WHERE target_type = 'withdrawal' AND target_id = ? ORDER BY created_at
    `).all(id);
    const journalPostings = this.database.prepare(`
      SELECT j.id AS journal_id, j.description, j.created_at, p.bucket, p.amount_vnd
      FROM wallet_journals j JOIN wallet_postings p ON p.journal_id = j.id
      WHERE j.reference_type = 'withdrawal' AND j.reference_id = ?
      ORDER BY j.created_at, p.amount_vnd
    `).all(id);
    return { ...withdrawal, auditLogs, journalPostings };
  }

  approveWithdrawal(id: string, actor: AdminActor, idempotencyKey: string) {
    return this.runIdempotent(actor, `withdrawal:${id}:approve`, idempotencyKey, {}, () => {
      const withdrawal = this.withdrawal(id);
      if (withdrawal.status === 'approved') return withdrawal;
      if (withdrawal.status !== 'pending') {
        throw new FinanceAdminError(
          `A ${withdrawal.status} withdrawal cannot be approved.`,
          'invalid_withdrawal_transition',
        );
      }
      const timestamp = nowIso();
      this.database.prepare(`
        UPDATE withdrawal_requests
        SET status = 'approved', reviewed_by = ?, reviewed_at = ?, updated_at = ? WHERE id = ?
      `).run(actor.id, timestamp, timestamp, id);
      this.audit(actor.id, 'withdrawal.approved', id, { from: 'pending', to: 'approved' }, timestamp);
      return this.withdrawal(id);
    });
  }

  rejectWithdrawal(id: string, actor: AdminActor, idempotencyKey: string, reason: string) {
    const normalizedReason = reason.trim();
    if (normalizedReason.length < 3 || normalizedReason.length > 500) {
      throw new FinanceAdminError('A rejection reason between 3 and 500 characters is required.', 'rejection_reason_invalid', 422);
    }
    return this.runIdempotent(actor, `withdrawal:${id}:reject`, idempotencyKey, { reason: normalizedReason }, () => {
      const withdrawal = this.withdrawal(id);
      if (withdrawal.status === 'rejected' && withdrawal.rejection_reason === normalizedReason) return withdrawal;
      if (withdrawal.status !== 'pending') {
        throw new FinanceAdminError(
          `A ${withdrawal.status} withdrawal cannot be rejected.`,
          'invalid_withdrawal_transition',
        );
      }
      const walletId = this.walletId(withdrawal.user_id);
      const timestamp = nowIso();
      postWalletTransfer(this.database, {
        fromWalletAccountId: walletId,
        fromBucket: 'reserved',
        toWalletAccountId: walletId,
        toBucket: 'available',
        amountVnd: withdrawal.amount_vnd,
        idempotencyKey: `withdrawal:release:${withdrawal.id}`,
        referenceType: 'withdrawal',
        referenceId: withdrawal.id,
        description: `Release rejected withdrawal ${withdrawal.id}`,
        createdAt: timestamp,
      });
      this.database.prepare(`
        UPDATE withdrawal_requests
        SET status = 'rejected', rejection_reason = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ?
        WHERE id = ?
      `).run(normalizedReason, actor.id, timestamp, timestamp, id);
      this.audit(actor.id, 'withdrawal.rejected', id, {
        from: 'pending', to: 'rejected', reason: normalizedReason,
      }, timestamp);
      return this.withdrawal(id);
    });
  }

  markWithdrawalPaid(id: string, actor: AdminActor, idempotencyKey: string, transactionCode: string) {
    const normalizedCode = transactionCode.trim().toUpperCase();
    if (!/^[A-Z0-9._/-]{4,100}$/.test(normalizedCode)) {
      throw new FinanceAdminError('The bank transaction code is invalid.', 'transaction_code_invalid', 422);
    }
    return this.runIdempotent(
      actor,
      `withdrawal:${id}:mark-paid`,
      idempotencyKey,
      { transactionCode: normalizedCode },
      () => {
        const withdrawal = this.withdrawal(id);
        if (withdrawal.status === 'paid' && withdrawal.transaction_code === normalizedCode) return withdrawal;
        if (withdrawal.status !== 'approved') {
          throw new FinanceAdminError(
            `A ${withdrawal.status} withdrawal cannot be marked paid.`,
            'invalid_withdrawal_transition',
          );
        }
        const duplicate = this.database.prepare(`
          SELECT id FROM withdrawal_requests WHERE transaction_code = ? AND id <> ?
        `).get(normalizedCode, id);
        if (duplicate) {
          throw new FinanceAdminError('This bank transaction code is already in use.', 'transaction_code_conflict');
        }
        const walletId = this.walletId(withdrawal.user_id);
        const timestamp = nowIso();
        postWalletTransfer(this.database, {
          fromWalletAccountId: walletId,
          fromBucket: 'reserved',
          toWalletAccountId: walletId,
          toBucket: 'withdrawn',
          amountVnd: withdrawal.amount_vnd,
          idempotencyKey: `withdrawal:paid:${withdrawal.id}`,
          referenceType: 'withdrawal',
          referenceId: withdrawal.id,
          description: `Complete withdrawal ${withdrawal.id}`,
          createdAt: timestamp,
        });
        this.database.prepare(`
          UPDATE withdrawal_requests
          SET status = 'paid', transaction_code = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ?
          WHERE id = ?
        `).run(normalizedCode, actor.id, timestamp, timestamp, id);
        this.audit(actor.id, 'withdrawal.paid', id, {
          from: 'approved', to: 'paid', transactionCode: normalizedCode,
        }, timestamp);
        return this.withdrawal(id);
      },
    );
  }

  private withdrawal(id: string): WithdrawalRow {
    const row = this.database.prepare(`
      SELECT id, user_id, amount_vnd, fee_vnd, net_amount_vnd, bank_name,
             bank_account_masked, account_name, status, transaction_code, rejection_reason,
             reviewed_by, reviewed_at, created_at, updated_at
      FROM withdrawal_requests WHERE id = ?
    `).get(id) as WithdrawalRow | undefined;
    if (!row) throw new FinanceAdminError('Withdrawal request was not found.', 'withdrawal_not_found', 404);
    return row;
  }

  private walletId(userId: string): string {
    const row = this.database.prepare('SELECT id FROM wallet_accounts WHERE user_id = ?')
      .get(userId) as { id: string } | undefined;
    if (!row) throw new FinanceAdminError('The withdrawal wallet was not found.', 'wallet_not_found', 500);
    return row.id;
  }

  private audit(
    actorUserId: string,
    action: string,
    targetId: string,
    metadata: Readonly<Record<string, unknown>>,
    timestamp: string,
  ): void {
    this.database.prepare(`
      INSERT INTO audit_logs(id, actor_user_id, action, target_type, target_id, metadata_json, created_at)
      VALUES (?, ?, ?, 'withdrawal', ?, ?, ?)
    `).run(createId('audit'), actorUserId, action, targetId, stableJson(metadata), timestamp);
  }

  private runIdempotent<T extends object>(
    actor: AdminActor,
    scope: string,
    idempotencyKey: string,
    request: unknown,
    execute: () => T,
  ): T {
    assertIdempotencyKey(idempotencyKey);
    const hash = requestHash(request);
    return this.database.transaction(() => {
      const existing = this.database.prepare(`
        SELECT request_hash, response_json FROM admin_idempotency_keys
        WHERE actor_user_id = ? AND scope = ? AND idempotency_key = ?
      `).get(actor.id, scope, idempotencyKey) as { request_hash: string; response_json: string } | undefined;
      if (existing) {
        if (existing.request_hash !== hash) {
          throw new FinanceAdminError(
            'This idempotency key was already used with a different request.',
            'admin_idempotency_conflict',
          );
        }
        return JSON.parse(existing.response_json) as T;
      }
      const result = execute();
      this.database.prepare(`
        INSERT INTO admin_idempotency_keys(
          id, actor_user_id, scope, idempotency_key, request_hash, response_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(createId('admin_key'), actor.id, scope, idempotencyKey, hash, JSON.stringify(result), nowIso());
      return result;
    })();
  }
}

