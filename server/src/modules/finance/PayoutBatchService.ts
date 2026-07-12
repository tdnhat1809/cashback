import { createHash } from 'node:crypto';
import type { SqliteDatabase } from '../../db/database.js';
import { createId, nowIso } from '../../lib/ids.js';
import type { AuthUser } from '../auth/service.js';
import { DeterministicMockPayoutGateway } from './DeterministicMockPayoutGateway.js';

type AdminActor = Pick<AuthUser, 'id' | 'role'>;
type PayoutBatchStatus = 'draft' | 'approved' | 'mock_submitted' | 'reconciled';

interface PayoutBatchRow {
  id: string;
  reference: string;
  memo: string | null;
  gateway_mode: 'deterministic_mock';
  status: PayoutBatchStatus;
  created_by: string;
  checked_by: string | null;
  checked_at: string | null;
  submitted_at: string | null;
  reconciled_at: string | null;
  reconciliation_summary_json: string | null;
  created_at: string;
  updated_at: string;
}

interface PayoutBatchItemRow {
  id: string;
  payout_batch_id: string;
  withdrawal_request_id: string;
  amount_vnd: number;
  bank_name: string;
  bank_account_masked: string;
  account_name: string;
  status: 'queued' | 'mock_submitted' | 'reconciled_mock';
  mock_gateway_reference: string | null;
  mock_gateway_status: 'accepted' | null;
  reconciliation_status: 'pending' | 'matched_mock';
  reconciliation_note: string | null;
  created_at: string;
  updated_at: string;
}

interface ApprovedWithdrawalRow {
  id: string;
  amount_vnd: number;
  bank_name: string;
  bank_account_masked: string;
  account_name: string;
  status: string;
}

export class PayoutBatchError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status = 409,
    readonly details?: Readonly<Record<string, unknown>>,
  ) {
    super(message);
    this.name = 'PayoutBatchError';
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
    throw new PayoutBatchError('A valid Idempotency-Key header is required.', 'idempotency_key_invalid', 422);
  }
};

const safety = {
  gatewayMode: 'deterministic_mock' as const,
  realBankActivity: false as const,
  withdrawalStateChanged: false as const,
};

/**
 * Offline payout-batch workflow. It deliberately does not write payment status,
 * transaction codes, or wallet postings to withdrawal requests. A batch can be
 * reviewed and reconciled against the deterministic mock only.
 */
export class PayoutBatchService {
  constructor(
    private readonly database: SqliteDatabase,
    private readonly gateway = new DeterministicMockPayoutGateway(),
  ) {}

  createBatch(input: {
    actor: AdminActor;
    idempotencyKey: string;
    withdrawalIds: readonly string[];
    memo?: string;
  }) {
    const normalizedWithdrawalIds = input.withdrawalIds.map((id) => id.trim());
    const withdrawalIds = [...new Set(normalizedWithdrawalIds)];
    if (
      withdrawalIds.length === 0
      || withdrawalIds.length > 100
      || withdrawalIds.length !== normalizedWithdrawalIds.length
      || withdrawalIds.some((id) => !id)
    ) {
      throw new PayoutBatchError('Select between one and one hundred unique withdrawal requests.', 'payout_batch_items_invalid', 422);
    }
    const memo = input.memo?.trim() || null;
    if (memo && memo.length > 500) {
      throw new PayoutBatchError('The batch memo must not exceed 500 characters.', 'payout_batch_memo_invalid', 422);
    }
    return this.runIdempotent(input.actor, 'payout-batches:create', input.idempotencyKey, { withdrawalIds, memo }, () => {
      const placeholders = withdrawalIds.map(() => '?').join(', ');
      const withdrawals = this.database.prepare(`
        SELECT id, amount_vnd, bank_name, bank_account_masked, account_name, status
        FROM withdrawal_requests WHERE id IN (${placeholders})
      `).all(...withdrawalIds) as ApprovedWithdrawalRow[];
      const byId = new Map(withdrawals.map((withdrawal) => [withdrawal.id, withdrawal]));
      const missing = withdrawalIds.filter((id) => !byId.has(id));
      if (missing.length) {
        throw new PayoutBatchError('One or more withdrawal requests were not found.', 'withdrawal_not_found', 404, { withdrawalIds: missing });
      }
      const notApproved = withdrawals.filter((withdrawal) => withdrawal.status !== 'approved').map((withdrawal) => withdrawal.id);
      if (notApproved.length) {
        throw new PayoutBatchError('Only approved withdrawals can be placed in an offline batch.', 'withdrawal_not_approved', 409, { withdrawalIds: notApproved });
      }
      const alreadyBatched = this.database.prepare(`
        SELECT withdrawal_request_id FROM payout_batch_items WHERE withdrawal_request_id IN (${placeholders})
      `).all(...withdrawalIds) as Array<{ withdrawal_request_id: string }>;
      if (alreadyBatched.length) {
        throw new PayoutBatchError(
          'A withdrawal request can belong to only one payout batch.',
          'withdrawal_already_batched',
          409,
          { withdrawalIds: alreadyBatched.map((item) => item.withdrawal_request_id) },
        );
      }

      const timestamp = nowIso();
      const batchId = createId('payout_batch');
      const reference = `OFFLINE-MOCK-${batchId.slice(-16).toUpperCase()}`;
      this.database.prepare(`
        INSERT INTO payout_batches(
          id, reference, memo, gateway_mode, status, created_by, idempotency_key, created_at, updated_at
        ) VALUES (?, ?, ?, 'deterministic_mock', 'draft', ?, ?, ?, ?)
      `).run(batchId, reference, memo, input.actor.id, input.idempotencyKey, timestamp, timestamp);
      const insertItem = this.database.prepare(`
        INSERT INTO payout_batch_items(
          id, payout_batch_id, withdrawal_request_id, amount_vnd, bank_name,
          bank_account_masked, account_name, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'queued', ?, ?)
      `);
      for (const withdrawalId of withdrawalIds) {
        const withdrawal = byId.get(withdrawalId)!;
        insertItem.run(
          createId('payout_item'), batchId, withdrawal.id, withdrawal.amount_vnd,
          withdrawal.bank_name, withdrawal.bank_account_masked, withdrawal.account_name, timestamp, timestamp,
        );
      }
      this.audit(input.actor.id, 'payout_batch.created', batchId, {
        reference, withdrawalCount: withdrawalIds.length, gatewayMode: 'deterministic_mock', realBankActivity: false,
      }, timestamp);
      return this.getBatch(batchId);
    });
  }

  listBatches(input: { status?: PayoutBatchStatus; limit?: number; offset?: number } = {}) {
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    const offset = Math.max(input.offset ?? 0, 0);
    return this.database.prepare(`
      SELECT b.id, b.reference, b.memo, b.gateway_mode, b.status, b.created_by, b.checked_by,
             b.checked_at, b.submitted_at, b.reconciled_at, b.created_at, b.updated_at,
             count(i.id) AS item_count, coalesce(sum(i.amount_vnd), 0) AS total_amount_vnd
      FROM payout_batches b LEFT JOIN payout_batch_items i ON i.payout_batch_id = b.id
      WHERE (? IS NULL OR b.status = ?)
      GROUP BY b.id
      ORDER BY b.created_at DESC LIMIT ? OFFSET ?
    `).all(input.status ?? null, input.status ?? null, limit, offset);
  }

  getBatch(id: string) {
    const batch = this.batch(id);
    const items = this.database.prepare(`
      SELECT id, payout_batch_id, withdrawal_request_id, amount_vnd, bank_name,
             bank_account_masked, account_name, status, mock_gateway_reference,
             mock_gateway_status, reconciliation_status, reconciliation_note, created_at, updated_at
      FROM payout_batch_items WHERE payout_batch_id = ? ORDER BY created_at, id
    `).all(id) as PayoutBatchItemRow[];
    const { reconciliation_summary_json: reconciliationSummaryJson, ...publicBatch } = batch;
    return {
      ...publicBatch,
      reconciliation_summary: reconciliationSummaryJson ? JSON.parse(reconciliationSummaryJson) : null,
      items,
      safety,
    };
  }

  approveBatch(id: string, actor: AdminActor, idempotencyKey: string) {
    return this.runIdempotent(actor, `payout-batch:${id}:approve`, idempotencyKey, {}, () => {
      const batch = this.batch(id);
      if (batch.status !== 'draft') {
        throw new PayoutBatchError(`A ${batch.status} payout batch cannot be approved.`, 'invalid_payout_batch_transition');
      }
      if (batch.created_by === actor.id) {
        throw new PayoutBatchError('The payout batch checker must differ from its maker.', 'payout_checker_must_differ');
      }
      const timestamp = nowIso();
      this.database.prepare(`
        UPDATE payout_batches SET status = 'approved', checked_by = ?, checked_at = ?, updated_at = ? WHERE id = ?
      `).run(actor.id, timestamp, timestamp, id);
      this.audit(actor.id, 'payout_batch.approved', id, { from: 'draft', to: 'approved', realBankActivity: false }, timestamp);
      return this.getBatch(id);
    });
  }

  submitMockBatch(id: string, actor: AdminActor, idempotencyKey: string) {
    return this.runIdempotent(actor, `payout-batch:${id}:submit-mock`, idempotencyKey, {}, () => {
      const batch = this.batch(id);
      this.assertChecker(batch, actor);
      if (batch.status !== 'approved') {
        throw new PayoutBatchError(`A ${batch.status} payout batch cannot be submitted to the mock gateway.`, 'invalid_payout_batch_transition');
      }
      const items = this.items(id);
      this.assertItemsRemainApproved(id);
      const timestamp = nowIso();
      const updateItem = this.database.prepare(`
        UPDATE payout_batch_items
        SET status = 'mock_submitted', mock_gateway_reference = ?, mock_gateway_status = 'accepted', updated_at = ?
        WHERE id = ?
      `);
      for (const item of items) {
        const receipt = this.gateway.submit({
          batchId: batch.id, batchReference: batch.reference, itemId: item.id,
          withdrawalRequestId: item.withdrawal_request_id, amountVnd: item.amount_vnd,
        });
        updateItem.run(receipt.reference, timestamp, item.id);
      }
      this.database.prepare(`
        UPDATE payout_batches SET status = 'mock_submitted', submitted_at = ?, updated_at = ? WHERE id = ?
      `).run(timestamp, timestamp, id);
      this.audit(actor.id, 'payout_batch.mock_submitted', id, {
        from: 'approved', to: 'mock_submitted', itemCount: items.length,
        gatewayMode: 'deterministic_mock', realBankActivity: false,
      }, timestamp);
      return this.getBatch(id);
    });
  }

  reconcileMockBatch(id: string, actor: AdminActor, idempotencyKey: string) {
    return this.runIdempotent(actor, `payout-batch:${id}:reconcile-mock`, idempotencyKey, {}, () => {
      const batch = this.batch(id);
      this.assertChecker(batch, actor);
      if (batch.status !== 'mock_submitted') {
        throw new PayoutBatchError(`A ${batch.status} payout batch cannot be reconciled.`, 'invalid_payout_batch_transition');
      }
      const items = this.items(id);
      this.assertItemsRemainApproved(id);
      const unmatched = items.filter((item) => !item.mock_gateway_reference || !this.gateway.reconcile({
        batchId: batch.id, batchReference: batch.reference, itemId: item.id,
        withdrawalRequestId: item.withdrawal_request_id, amountVnd: item.amount_vnd,
      }, item.mock_gateway_reference));
      if (unmatched.length) {
        throw new PayoutBatchError('The mock reconciliation data did not match the batch items.', 'mock_reconciliation_mismatch', 409, {
          itemIds: unmatched.map((item) => item.id),
        });
      }
      const timestamp = nowIso();
      const summary = { itemCount: items.length, matchedMockCount: items.length, gatewayMode: 'deterministic_mock', realBankActivity: false };
      this.database.prepare(`
        UPDATE payout_batch_items
        SET status = 'reconciled_mock', reconciliation_status = 'matched_mock',
            reconciliation_note = 'Matched deterministic mock receipt; no bank activity occurred.', updated_at = ?
        WHERE payout_batch_id = ?
      `).run(timestamp, id);
      this.database.prepare(`
        UPDATE payout_batches
        SET status = 'reconciled', reconciled_at = ?, reconciliation_summary_json = ?, updated_at = ? WHERE id = ?
      `).run(timestamp, stableJson(summary), timestamp, id);
      this.audit(actor.id, 'payout_batch.mock_reconciled', id, {
        from: 'mock_submitted', to: 'reconciled', ...summary, withdrawalStateChanged: false,
      }, timestamp);
      return this.getBatch(id);
    });
  }

  private batch(id: string): PayoutBatchRow {
    const batch = this.database.prepare(`
      SELECT id, reference, memo, gateway_mode, status, created_by, checked_by,
             checked_at, submitted_at, reconciled_at, reconciliation_summary_json, created_at, updated_at
      FROM payout_batches WHERE id = ?
    `).get(id) as PayoutBatchRow | undefined;
    if (!batch) throw new PayoutBatchError('Payout batch was not found.', 'payout_batch_not_found', 404);
    return batch;
  }

  private items(batchId: string): PayoutBatchItemRow[] {
    return this.database.prepare('SELECT * FROM payout_batch_items WHERE payout_batch_id = ? ORDER BY created_at, id')
      .all(batchId) as PayoutBatchItemRow[];
  }

  private assertItemsRemainApproved(batchId: string): void {
    const noLongerApproved = this.database.prepare(`
      SELECT i.withdrawal_request_id, w.status
      FROM payout_batch_items i JOIN withdrawal_requests w ON w.id = i.withdrawal_request_id
      WHERE i.payout_batch_id = ? AND w.status <> 'approved'
    `).all(batchId) as Array<{ withdrawal_request_id: string; status: string }>;
    if (noLongerApproved.length) {
      throw new PayoutBatchError(
        'All payout-batch withdrawals must still be approved before mock processing.',
        'withdrawal_no_longer_approved',
        409,
        { withdrawals: noLongerApproved },
      );
    }
  }

  private assertChecker(batch: PayoutBatchRow, actor: AdminActor): void {
    if (batch.checked_by !== actor.id) {
      throw new PayoutBatchError('Only the assigned checker can submit or reconcile this offline batch.', 'payout_checker_required', 403);
    }
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
      VALUES (?, ?, ?, 'payout_batch', ?, ?, ?)
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
          throw new PayoutBatchError('This idempotency key was already used with a different request.', 'admin_idempotency_conflict');
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
