import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { SqliteDatabase } from '../../db/database.js';
import { createId, nowIso } from '../../lib/ids.js';
import { WalletService, type WalletBucket } from '../wallet/WalletService.js';
import { ensureSettlementClearingWallet, postWalletTransfer } from './accounting.js';
import type {
  SettlementImport,
  SettlementImportItem,
  SettlementImportResult,
  SettlementStage,
} from './settlement-types.js';

const moneySchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const itemSchema = z.object({
  externalConversionId: z.string().trim().min(1).max(200),
  externalOrderId: z.string().trim().min(1).max(200),
  externalItemId: z.string().trim().min(1).max(200),
  modelId: z.string().trim().max(200).default(''),
  trackingTag: z.string().trim().min(1).max(128).optional(),
  category: z.string().trim().min(1).max(200).default('*'),
  actualCommissionVnd: moneySchema,
  orderValueVnd: moneySchema.default(0),
  stage: z.enum(['pending', 'validated', 'settled', 'rejected']),
  purchasedAt: z.iso.datetime().optional(),
  itemName: z.string().trim().max(500).optional(),
  imageUrl: z.string().url().optional(),
});
const reportSchema = z.object({
  platform: z.literal('shopee'),
  externalValidationId: z.string().trim().min(1).max(200),
  observedAt: z.iso.datetime(),
  grossCommissionVnd: moneySchema,
  mcnFeeVnd: moneySchema.default(0),
  providerServiceFeeVnd: moneySchema.default(0),
  taxWithheldVnd: moneySchema.optional(),
  items: z.array(itemSchema).min(1).max(10_000),
  rawPayload: z.unknown(),
});

interface PolicyRow {
  id: string;
  version: string;
  user_share_bps: number;
  withholding_tax_bps: number;
}

interface ConversionRow {
  id: string;
  user_id: string | null;
  status: 'pending' | 'confirmed' | 'rejected' | 'paid';
}

interface OrderRow {
  id: string;
  cashback_estimate_vnd: number;
  cashback_actual_vnd: number;
}

interface ExistingReportRow {
  id: string;
  raw_payload_hash: string;
  sync_run_id: string | null;
  gross_commission_vnd: number;
  tax_withheld_vnd: number;
  distributable_net_vnd: number;
}

interface GroupedOrder {
  conversionId: string;
  externalConversionId: string;
  externalOrderId: string;
  userId: string | null;
  statusBefore: ConversionRow['status'];
  stage: SettlementStage;
  orderValueVnd: number;
  cashbackVnd: number;
  purchasedAt?: string;
}

export class SettlementError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status = 422,
    readonly details?: Readonly<Record<string, unknown>>,
  ) {
    super(message);
    this.name = 'SettlementError';
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const first = (record: Record<string, unknown>, keys: readonly string[]): unknown => {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) return record[key];
  }
  return undefined;
};

const textValue = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
};

const moneyValue = (value: unknown, fallback = 0): number => {
  if (value === undefined || value === null || value === '') return fallback;
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return Number.NaN;
  return Math.round(numeric);
};

export const mapShopeeSettlementStage = (value: unknown): SettlementStage => {
  const normalized = String(value ?? '').trim().toLowerCase().replaceAll(/[^a-z0-9]+/g, '_');
  if (['pending', 'processing', 'estimated', 'pending_validation', 'open'].includes(normalized)) return 'pending';
  if (['validated', 'approved', 'confirmed', 'complete', 'completed'].includes(normalized)) return 'validated';
  if (['settled', 'paid', 'payable'].includes(normalized)) return 'settled';
  if (['rejected', 'invalid', 'cancelled', 'canceled', 'void'].includes(normalized)) return 'rejected';
  throw new SettlementError(`Unsupported Shopee settlement status: ${String(value)}`, 'unsupported_settlement_status');
};

const candidateItems = (raw: Record<string, unknown>): unknown[] | undefined => {
  const direct = first(raw, ['items', 'conversions', 'orders', 'nodes']);
  if (Array.isArray(direct)) return direct;
  for (const containerKey of ['data', 'conversionReport', 'validatedReport', 'report']) {
    const container = raw[containerKey];
    if (!isRecord(container)) continue;
    const nested = candidateItems(container);
    if (nested) return nested;
  }
  return undefined;
};

const mapRawItem = (value: unknown): SettlementImportItem => {
  if (!isRecord(value)) throw new SettlementError('Every settlement item must be an object.', 'invalid_settlement_item');
  const order = isRecord(value.order) ? value.order : {};
  const product = isRecord(value.item) ? value.item : (isRecord(value.product) ? value.product : {});
  return {
    externalConversionId: textValue(first(value, ['externalConversionId', 'conversionId', 'conversion_id']))
      ?? textValue(first(order, ['conversionId', 'conversion_id'])) ?? '',
    externalOrderId: textValue(first(value, ['externalOrderId', 'orderId', 'order_id']))
      ?? textValue(first(order, ['id', 'orderId', 'order_id'])) ?? '',
    externalItemId: textValue(first(value, ['externalItemId', 'itemId', 'item_id', 'productId']))
      ?? textValue(first(product, ['id', 'itemId', 'item_id', 'productId'])) ?? '',
    modelId: textValue(first(value, ['modelId', 'model_id', 'variationId'])) ?? '',
    trackingTag: textValue(first(value, ['trackingTag', 'tracking_tag', 'subId', 'sub_id', 'utmContent'])),
    category: textValue(first(value, ['category', 'categoryName', 'category_name'])) ?? '*',
    actualCommissionVnd: moneyValue(first(value, [
      'actualCommissionVnd', 'actualCommission', 'actual_commission', 'commissionVnd', 'commission', 'commission_value',
    ])),
    orderValueVnd: moneyValue(first(value, ['orderValueVnd', 'orderValue', 'order_value', 'gmv', 'amount'])),
    stage: mapShopeeSettlementStage(first(value, ['stage', 'status', 'conversionStatus', 'validationStatus'])),
    purchasedAt: textValue(first(value, ['purchasedAt', 'purchaseTime', 'purchase_time', 'createdAt'])),
    itemName: textValue(first(value, ['itemName', 'productName', 'product_name', 'name']))
      ?? textValue(first(product, ['name', 'productName'])),
    imageUrl: textValue(first(value, ['imageUrl', 'image_url'])) ?? textValue(first(product, ['imageUrl', 'image_url'])),
  };
};

/** Accepts the canonical API contract as well as common Shopee GraphQL/report field names. */
export const normalizeShopeeSettlementReport = (input: unknown): SettlementImport => {
  if (!isRecord(input)) throw new SettlementError('Settlement payload must be an object.', 'invalid_settlement_payload');
  if (input.platform !== undefined && input.platform !== 'shopee') {
    throw new SettlementError('Only Shopee settlement reports can create payable cashback.', 'provider_not_payable', 422);
  }
  const rawItems = candidateItems(input);
  if (!rawItems) throw new SettlementError('The Shopee report does not contain conversion items.', 'settlement_items_missing');
  const items = rawItems.map(mapRawItem);
  const itemGross = items.reduce((total, item) => total + item.actualCommissionVnd, 0);
  const rawPayload = input.rawPayload ?? input;
  const parsed = reportSchema.safeParse({
    platform: 'shopee',
    externalValidationId: textValue(first(input, [
      'externalValidationId', 'validationId', 'validation_id', 'reportId', 'report_id', 'requestId',
    ])),
    observedAt: textValue(first(input, ['observedAt', 'observed_at', 'generatedAt', 'generated_at'])),
    grossCommissionVnd: moneyValue(first(input, [
      'grossCommissionVnd', 'grossCommission', 'gross_commission', 'totalCommission', 'total_commission',
    ]), itemGross),
    mcnFeeVnd: moneyValue(first(input, ['mcnFeeVnd', 'mcnFee', 'mcn_fee'])),
    providerServiceFeeVnd: moneyValue(first(input, [
      'providerServiceFeeVnd', 'providerServiceFee', 'serviceFee', 'service_fee',
    ])),
    taxWithheldVnd: first(input, ['taxWithheldVnd', 'taxWithheld', 'tax_withheld']) === undefined
      ? undefined
      : moneyValue(first(input, ['taxWithheldVnd', 'taxWithheld', 'tax_withheld'])),
    items,
    rawPayload,
  });
  if (!parsed.success) {
    throw new SettlementError('The Shopee settlement payload is invalid.', 'invalid_settlement_payload', 422, {
      fields: z.flattenError(parsed.error).fieldErrors,
    });
  }
  return parsed.data;
};

const stableJson = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
};

const payloadHash = (payload: unknown): string => createHash('sha256').update(stableJson(payload)).digest('hex');

const conversionStatusFor = (stage: SettlementStage): ConversionRow['status'] => {
  if (stage === 'pending') return 'pending';
  if (stage === 'validated') return 'confirmed';
  if (stage === 'settled') return 'paid';
  return 'rejected';
};

const assertTransition = (before: ConversionRow['status'], stage: SettlementStage): void => {
  const after = conversionStatusFor(stage);
  const allowed: Readonly<Record<ConversionRow['status'], readonly ConversionRow['status'][]>> = {
    pending: ['pending', 'confirmed', 'paid', 'rejected'],
    confirmed: ['confirmed', 'paid'],
    paid: ['paid'],
    rejected: ['rejected'],
  };
  if (!allowed[before].includes(after)) {
    throw new SettlementError(
      `Invalid conversion transition from ${before} to ${after}.`,
      'invalid_conversion_transition',
      409,
    );
  }
};

const allocateInteger = (total: number, weights: readonly number[]): number[] => {
  const sum = weights.reduce((value, weight) => value + weight, 0);
  if (total === 0 || sum === 0) return weights.map(() => 0);
  const raw = weights.map((weight) => (total * weight) / sum);
  const result = raw.map(Math.floor);
  let remainder = total - result.reduce((value, amount) => value + amount, 0);
  const rank = raw.map((amount, index) => ({ index, fraction: amount - Math.floor(amount) }))
    .sort((left, right) => right.fraction - left.fraction || left.index - right.index);
  for (let index = 0; index < rank.length && remainder > 0; index += 1, remainder -= 1) {
    const target = rank[index];
    if (target) result[target.index] = (result[target.index] ?? 0) + 1;
  }
  return result;
};

export class SettlementService {
  private readonly wallets: WalletService;

  constructor(private readonly database: SqliteDatabase, encryptionKey = 'settlement-service-unused-key') {
    this.wallets = new WalletService(database, encryptionKey);
  }

  importReport(input: unknown): SettlementImportResult {
    const report = normalizeShopeeSettlementReport(input);
    const hash = payloadHash(report.rawPayload);
    const syncRunId = createId('sync');
    const startedAt = nowIso();
    this.database.prepare(`
      INSERT INTO provider_sync_runs(
        id, provider, stream, mode, status, window_start, window_end, started_at
      ) VALUES (?, 'shopee', 'settlements', 'live', 'running', ?, ?, ?)
    `).run(syncRunId, report.observedAt, report.observedAt, startedAt);

    try {
      const result = this.database.transaction(() => this.reconcile(report, hash, syncRunId))();
      this.database.prepare(`
        UPDATE provider_sync_runs SET status = 'completed', page_count = 1, record_count = ?, finished_at = ?
        WHERE id = ?
      `).run(result.idempotentReplay ? 0 : report.items.length, nowIso(), syncRunId);
      return result;
    } catch (error) {
      this.database.prepare(`
        UPDATE provider_sync_runs SET status = 'failed', error = ?, finished_at = ? WHERE id = ?
      `).run(error instanceof Error ? error.message.slice(0, 1000) : 'Unknown settlement error', nowIso(), syncRunId);
      throw error;
    }
  }

  listReports(limit = 50, offset = 0) {
    return this.database.prepare(`
      SELECT id, platform, external_validation_id, status, gross_commission_vnd, mcn_fee_vnd,
             provider_service_fee_vnd, tax_withheld_vnd, distributable_net_vnd, observed_at,
             reconciled_at, sync_run_id, created_at
      FROM settlement_reports ORDER BY observed_at DESC LIMIT ? OFFSET ?
    `).all(limit, offset);
  }

  getReport(id: string) {
    const report = this.database.prepare(`
      SELECT id, platform, external_validation_id, status, gross_commission_vnd, mcn_fee_vnd,
             provider_service_fee_vnd, tax_withheld_vnd, distributable_net_vnd, observed_at,
             reconciled_at, sync_run_id, created_at
      FROM settlement_reports WHERE id = ?
    `).get(id);
    if (!report) throw new SettlementError('Settlement report was not found.', 'settlement_report_not_found', 404);
    const items = this.database.prepare(`
      SELECT si.id, si.conversion_id, si.external_order_id, si.external_item_id, si.model_id,
             si.actual_commission_vnd, c.status AS conversion_status, c.tracking_tag,
             o.cashback_estimate_vnd, o.cashback_actual_vnd
      FROM settlement_items si
      JOIN conversions c ON c.id = si.conversion_id
      LEFT JOIN orders o ON o.conversion_id = c.id AND o.external_order_id = si.external_order_id
      WHERE si.settlement_report_id = ? ORDER BY si.external_order_id, si.external_item_id
    `).all(id);
    return { ...(report as object), items };
  }

  private reconcile(report: SettlementImport, hash: string, syncRunId: string): SettlementImportResult {
    const existing = this.database.prepare(`
      SELECT id, raw_payload_hash, sync_run_id, gross_commission_vnd, tax_withheld_vnd, distributable_net_vnd
      FROM settlement_reports WHERE platform = ? AND external_validation_id = ?
    `).get(report.platform, report.externalValidationId) as ExistingReportRow | undefined;
    if (existing) {
      if (existing.raw_payload_hash !== hash) {
        throw new SettlementError(
          'This validation ID was already imported with different content.',
          'settlement_idempotency_conflict',
          409,
        );
      }
      const totals = this.reportCashback(existing.id);
      const policy = this.policyFor(report.platform, report.observedAt, '*');
      return {
        reportId: existing.id,
        syncRunId,
        idempotentReplay: true,
        status: 'reconciled',
        policyVersion: policy.version,
        grossCommissionVnd: existing.gross_commission_vnd,
        taxWithheldVnd: existing.tax_withheld_vnd,
        distributableNetVnd: existing.distributable_net_vnd,
        cashbackVnd: totals.cashback,
        matchedItems: totals.matched,
        unmatchedItems: totals.unmatched,
      };
    }

    const policy = this.policyFor(report.platform, report.observedAt, '*');
    const preTax = report.grossCommissionVnd - report.mcnFeeVnd - report.providerServiceFeeVnd;
    if (preTax < 0) throw new SettlementError('Fees cannot exceed gross commission.', 'invalid_settlement_totals');
    const tax = report.taxWithheldVnd
      ?? Math.floor((preTax * policy.withholding_tax_bps) / 10_000);
    const net = preTax - tax;
    if (net < 0) throw new SettlementError('Tax cannot exceed commission after fees.', 'invalid_settlement_totals');

    const reportId = createId('settlement');
    const timestamp = nowIso();
    this.database.prepare(`
      INSERT INTO settlement_reports(
        id, platform, external_validation_id, status, gross_commission_vnd, mcn_fee_vnd,
        provider_service_fee_vnd, tax_withheld_vnd, distributable_net_vnd, raw_payload_hash,
        observed_at, created_at, sync_run_id
      ) VALUES (?, ?, ?, 'imported', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      reportId, report.platform, report.externalValidationId, report.grossCommissionVnd,
      report.mcnFeeVnd, report.providerServiceFeeVnd, tax, net, hash, report.observedAt, timestamp, syncRunId,
    );

    const netByItem = allocateInteger(net, report.items.map((item) => item.actualCommissionVnd));
    const cashbackByItem = netByItem.map((itemNet) => Math.floor((itemNet * policy.user_share_bps) / 10_000));
    const conversionBefore = new Map<string, ConversionRow['status']>();
    const groupMap = new Map<string, GroupedOrder>();
    let matchedItems = 0;
    let unmatchedItems = 0;

    report.items.forEach((item, index) => {
      const conversion = this.upsertConversion(report, item, timestamp);
      if (!conversionBefore.has(conversion.id)) conversionBefore.set(conversion.id, conversion.status);
      const initialStatus = conversionBefore.get(conversion.id) ?? conversion.status;
      assertTransition(initialStatus, item.stage);
      const existingGroup = [...groupMap.values()].find((group) => group.conversionId === conversion.id);
      if (existingGroup && existingGroup.stage !== item.stage) {
        throw new SettlementError(
          'All items in a conversion must have the same settlement stage.',
          'mixed_conversion_stages',
        );
      }

      this.database.prepare(`
        INSERT INTO settlement_items(
          id, settlement_report_id, conversion_id, external_order_id, external_item_id,
          model_id, actual_commission_vnd, raw_payload_hash
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        createId('settlement_item'), reportId, conversion.id, item.externalOrderId,
        item.externalItemId, item.modelId, item.actualCommissionVnd, payloadHash(item),
      );
      this.upsertOrderItem(conversion.id, item, timestamp);

      const groupKey = `${conversion.id}\u0000${item.externalOrderId}`;
      const group = groupMap.get(groupKey) ?? {
        conversionId: conversion.id,
        externalConversionId: item.externalConversionId,
        externalOrderId: item.externalOrderId,
        userId: conversion.user_id,
        statusBefore: initialStatus,
        stage: item.stage,
        orderValueVnd: 0,
        cashbackVnd: 0,
        ...(item.purchasedAt ? { purchasedAt: item.purchasedAt } : {}),
      };
      group.orderValueVnd += item.orderValueVnd;
      group.cashbackVnd += cashbackByItem[index] ?? 0;
      groupMap.set(groupKey, group);
      if (conversion.user_id) matchedItems += 1;
      else unmatchedItems += 1;
    });

    for (const group of groupMap.values()) this.applyOrderSettlement(reportId, policy, group, timestamp);
    for (const [conversionId, before] of conversionBefore) {
      const relevant = [...groupMap.values()].find((group) => group.conversionId === conversionId);
      if (!relevant) continue;
      assertTransition(before, relevant.stage);
      this.database.prepare(`
        UPDATE conversions SET status = ?, net_commission_vnd = ?, updated_at = ? WHERE id = ?
      `).run(conversionStatusFor(relevant.stage), relevant.cashbackVnd, timestamp, conversionId);
    }
    this.database.prepare(`
      UPDATE settlement_reports SET status = 'reconciled', reconciled_at = ? WHERE id = ?
    `).run(timestamp, reportId);

    return {
      reportId,
      syncRunId,
      idempotentReplay: false,
      status: 'reconciled',
      policyVersion: policy.version,
      grossCommissionVnd: report.grossCommissionVnd,
      taxWithheldVnd: tax,
      distributableNetVnd: net,
      cashbackVnd: [...groupMap.values()].reduce((total, group) => total + (group.userId ? group.cashbackVnd : 0), 0),
      matchedItems,
      unmatchedItems,
    };
  }

  private policyFor(platform: string, observedAt: string, category: string): PolicyRow {
    const policy = this.database.prepare(`
      SELECT p.id, p.version, p.user_share_bps, p.withholding_tax_bps
      FROM cashback_policies p
      JOIN cashback_policy_rules r ON r.policy_id = p.id
      WHERE p.active = 1 AND r.active = 1 AND r.platform = ? AND r.category IN (?, '*')
        AND p.effective_from <= ? AND (p.effective_to IS NULL OR p.effective_to > ?)
      ORDER BY CASE WHEN r.category = ? THEN 0 ELSE 1 END, p.effective_from DESC
      LIMIT 1
    `).get(platform, category, observedAt, observedAt, category) as PolicyRow | undefined;
    if (!policy) throw new SettlementError('No active cashback policy covers this report.', 'cashback_policy_not_found', 409);
    return policy;
  }

  private upsertConversion(report: SettlementImport, item: SettlementImportItem, timestamp: string): ConversionRow {
    const existing = this.database.prepare(`
      SELECT id, user_id, status FROM conversions WHERE platform = ? AND external_conversion_id = ?
    `).get(report.platform, item.externalConversionId) as ConversionRow | undefined;
    if (existing) return existing;
    const link = item.trackingTag
      ? this.database.prepare('SELECT id, user_id FROM affiliate_links WHERE tracking_tag = ?')
        .get(item.trackingTag) as { id: string; user_id: string } | undefined
      : undefined;
    const conversionId = createId('conversion');
    this.database.prepare(`
      INSERT INTO conversions(
        id, platform, external_conversion_id, affiliate_link_id, user_id, tracking_tag, status,
        gross_commission_vnd, net_commission_vnd, source_payload_json, purchased_at, updated_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, 0, ?, ?, ?, ?)
    `).run(
      conversionId, report.platform, item.externalConversionId, link?.id ?? null, link?.user_id ?? null,
      item.trackingTag ?? null, item.actualCommissionVnd, JSON.stringify(item), item.purchasedAt ?? null,
      timestamp, timestamp,
    );
    return { id: conversionId, user_id: link?.user_id ?? null, status: 'pending' };
  }

  private upsertOrderItem(conversionId: string, item: SettlementImportItem, timestamp: string): void {
    let order = this.database.prepare(`
      SELECT id, cashback_estimate_vnd, cashback_actual_vnd FROM orders
      WHERE conversion_id = ? AND external_order_id = ?
    `).get(conversionId, item.externalOrderId) as OrderRow | undefined;
    if (!order) {
      const orderId = createId('order');
      this.database.prepare(`
        INSERT INTO orders(
          id, conversion_id, external_order_id, status, order_value_vnd,
          cashback_estimate_vnd, cashback_actual_vnd, updated_at, created_at
        ) VALUES (?, ?, ?, ?, 0, 0, 0, ?, ?)
      `).run(orderId, conversionId, item.externalOrderId, item.stage, timestamp, timestamp);
      order = { id: orderId, cashback_estimate_vnd: 0, cashback_actual_vnd: 0 };
    }
    this.database.prepare(`
      INSERT INTO order_items(id, order_id, external_item_id, name, image_url, quantity, amount_vnd, commission_vnd)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?)
      ON CONFLICT DO NOTHING
    `).run(
      createId('order_item'), order.id, item.externalItemId, item.itemName ?? `Shopee item ${item.externalItemId}`,
      item.imageUrl ?? null, item.orderValueVnd, item.actualCommissionVnd,
    );
  }

  private applyOrderSettlement(
    reportId: string,
    policy: PolicyRow,
    group: GroupedOrder,
    timestamp: string,
  ): void {
    const order = this.database.prepare(`
      SELECT id, cashback_estimate_vnd, cashback_actual_vnd FROM orders
      WHERE conversion_id = ? AND external_order_id = ?
    `).get(group.conversionId, group.externalOrderId) as OrderRow;

    if (group.userId) {
      const walletId = this.wallets.ensureWallet(group.userId);
      const clearingId = ensureSettlementClearingWallet(this.database);
      if (group.stage === 'pending') {
        this.adjustBucket(
          clearingId, walletId, 'pending', group.cashbackVnd - order.cashback_estimate_vnd,
          `${reportId}:${order.id}:pending`, reportId, policy.version, timestamp,
        );
      } else if (group.stage === 'validated' || group.stage === 'settled') {
        if (order.cashback_actual_vnd > 0) {
          this.adjustBucket(
            clearingId, walletId, 'available', group.cashbackVnd - order.cashback_actual_vnd,
            `${reportId}:${order.id}:available-adjust`, reportId, policy.version, timestamp,
          );
        } else if (order.cashback_estimate_vnd > 0) {
          this.adjustBucket(
            clearingId, walletId, 'pending', group.cashbackVnd - order.cashback_estimate_vnd,
            `${reportId}:${order.id}:pending-finalize`, reportId, policy.version, timestamp,
          );
          postWalletTransfer(this.database, {
            fromWalletAccountId: walletId,
            fromBucket: 'pending',
            toWalletAccountId: walletId,
            toBucket: 'available',
            amountVnd: group.cashbackVnd,
            idempotencyKey: `cashback:${reportId}:${order.id}:release`,
            referenceType: 'cashback_settlement',
            referenceId: reportId,
            description: `Release validated cashback for order ${group.externalOrderId}`,
            policyVersion: policy.version,
            createdAt: timestamp,
          });
        } else {
          postWalletTransfer(this.database, {
            fromWalletAccountId: clearingId,
            fromBucket: 'available',
            toWalletAccountId: walletId,
            toBucket: 'available',
            amountVnd: group.cashbackVnd,
            idempotencyKey: `cashback:${reportId}:${order.id}:direct-release`,
            referenceType: 'cashback_settlement',
            referenceId: reportId,
            description: `Credit validated cashback for order ${group.externalOrderId}`,
            policyVersion: policy.version,
            createdAt: timestamp,
          });
        }
      } else if (order.cashback_estimate_vnd > 0 && order.cashback_actual_vnd === 0) {
        postWalletTransfer(this.database, {
          fromWalletAccountId: walletId,
          fromBucket: 'pending',
          toWalletAccountId: clearingId,
          toBucket: 'available',
          amountVnd: order.cashback_estimate_vnd,
          idempotencyKey: `cashback:${reportId}:${order.id}:reject`,
          referenceType: 'cashback_rejection',
          referenceId: reportId,
          description: `Reverse rejected cashback for order ${group.externalOrderId}`,
          policyVersion: policy.version,
          createdAt: timestamp,
        });
      }
    }

    const estimate = group.stage === 'rejected' ? 0 : group.cashbackVnd;
    const actual = group.stage === 'validated' || group.stage === 'settled' ? group.cashbackVnd : 0;
    this.database.prepare(`
      UPDATE orders SET status = ?, order_value_vnd = ?, cashback_estimate_vnd = ?,
             cashback_actual_vnd = ?, completed_at = ?, updated_at = ? WHERE id = ?
    `).run(
      group.stage, group.orderValueVnd, estimate, actual,
      group.stage === 'settled' ? timestamp : null, timestamp, order.id,
    );
  }

  private adjustBucket(
    clearingId: string,
    walletId: string,
    bucket: WalletBucket,
    delta: number,
    keySuffix: string,
    referenceId: string,
    policyVersion: string,
    timestamp: string,
  ): void {
    if (delta === 0) return;
    postWalletTransfer(this.database, {
      fromWalletAccountId: delta > 0 ? clearingId : walletId,
      fromBucket: delta > 0 ? 'available' : bucket,
      toWalletAccountId: delta > 0 ? walletId : clearingId,
      toBucket: delta > 0 ? bucket : 'available',
      amountVnd: Math.abs(delta),
      idempotencyKey: `cashback:${keySuffix}`,
      referenceType: 'cashback_adjustment',
      referenceId,
      description: `Adjust ${bucket} cashback balance`,
      policyVersion,
      createdAt: timestamp,
    });
  }

  private reportCashback(reportId: string): { cashback: number; matched: number; unmatched: number } {
    const rows = this.database.prepare(`
      SELECT c.user_id, o.cashback_estimate_vnd, o.cashback_actual_vnd
      FROM settlement_items si
      JOIN conversions c ON c.id = si.conversion_id
      JOIN orders o ON o.conversion_id = c.id AND o.external_order_id = si.external_order_id
      WHERE si.settlement_report_id = ?
    `).all(reportId) as Array<{
      user_id: string | null;
      cashback_estimate_vnd: number;
      cashback_actual_vnd: number;
    }>;
    const unique = new Map<string, typeof rows[number]>();
    for (const row of rows) {
      const key = `${row.user_id ?? 'unmatched'}:${row.cashback_estimate_vnd}:${row.cashback_actual_vnd}`;
      unique.set(key, row);
    }
    return [...unique.values()].reduce((result, row) => ({
      cashback: result.cashback + (row.user_id ? Math.max(row.cashback_actual_vnd, row.cashback_estimate_vnd) : 0),
      matched: result.matched + (row.user_id ? 1 : 0),
      unmatched: result.unmatched + (row.user_id ? 0 : 1),
    }), { cashback: 0, matched: 0, unmatched: 0 });
  }
}

