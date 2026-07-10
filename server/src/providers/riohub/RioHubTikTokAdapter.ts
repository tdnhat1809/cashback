import { paginateOfflineFixture, OfflineFixtureAdapterError } from '../conversions/fixture-pagination.js';
import type { CursorSyncProvider, NormalizedConversion, ProviderCapability } from '../types.js';

const CONVERSION_STREAM = 'conversions';
const FIXTURE_NAMESPACE = 'riohub-tiktok-conversions';

export type RioHubTikTokAdapterMode = 'mock' | 'disabled';
export type RioHubTikTokConversionFixture = Readonly<Record<string, unknown>>;

export interface RioHubTikTokAdapterOptions {
  mode?: RioHubTikTokAdapterMode;
  fixtures?: readonly RioHubTikTokConversionFixture[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const first = (record: Record<string, unknown>, keys: readonly string[]): unknown => {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
};

const optionalText = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
};

const requiredText = (value: unknown, field: string): string => {
  const text = optionalText(value);
  if (!text) throw new OfflineFixtureAdapterError(`RioHub fixture field ${field} is required.`, 'invalid_riohub_tiktok_fixture');
  return text;
};

const decimal = (value: unknown, field: string): string => {
  const text = optionalText(value);
  if (!text || !/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(text)) {
    throw new OfflineFixtureAdapterError(
      `RioHub fixture field ${field} must be a non-negative decimal string.`,
      'invalid_riohub_tiktok_fixture',
    );
  }
  return text;
};

const fixtureItem = (fixture: Record<string, unknown>): Record<string, unknown> => {
  const direct = first(fixture, ['item', 'product']);
  if (isRecord(direct)) return direct;
  const items = first(fixture, ['items', 'order_items']);
  if (Array.isArray(items) && isRecord(items[0])) return items[0];
  return fixture;
};

/**
 * Maps a local RioHub-shaped TikTok order fixture only. A received event ID is
 * retained inside `raw` so a later webhook/queue implementation can make its
 * own idempotency decision without this mapper silently discarding evidence.
 */
export const mapRioHubTikTokConversionFixture = (fixture: unknown): NormalizedConversion => {
  if (!isRecord(fixture)) {
    throw new OfflineFixtureAdapterError('RioHub TikTok fixture must be an object.', 'invalid_riohub_tiktok_fixture');
  }
  const status = String(first(fixture, ['status', 'order_status', 'state']) ?? '')
    .trim().toLowerCase().replaceAll(/[^a-z0-9]+/g, '_');
  const settlementStatus = String(first(fixture, ['settlement_status', 'settlementStatus']) ?? '')
    .trim().toLowerCase().replaceAll(/[^a-z0-9]+/g, '_');
  const providerStatus: NormalizedConversion['providerStatus'] = (() => {
    if (['1', 'pending', 'created', 'processing'].includes(status)) return 'pending';
    if (['3', 'rejected', 'refunded', 'refund', 'cancelled', 'canceled', 'void'].includes(status)) return 'cancelled';
    if (['fraud', 'fraudulent'].includes(status)) return 'fraud';
    if (['completed', 'paid', 'settled'].includes(status)) return 'completed';
    if (['2', 'validated', 'confirmed', 'approved'].includes(status)) {
      return ['settled', 'completed', 'paid'].includes(settlementStatus) ? 'completed' : 'validated';
    }
    throw new OfflineFixtureAdapterError(`Unsupported RioHub TikTok fixture status: ${status || '(empty)'}.`, 'unsupported_riohub_tiktok_status');
  })();
  const currency = String(first(fixture, ['currency', 'currency_code', 'currencyCode']) ?? 'VND').trim().toUpperCase();
  if (currency !== 'VND') {
    throw new OfflineFixtureAdapterError('RioHub TikTok fixtures must use VND.', 'unsupported_riohub_tiktok_currency');
  }
  const item = fixtureItem(fixture);
  const externalOrderId = requiredText(first(fixture, ['externalOrderId', 'orderId', 'order_id']), 'orderId');
  const grossCommissionDecimal = decimal(first(fixture, [
    'grossCommissionDecimal', 'grossCommission', 'gross_commission', 'estimatedCommission', 'estimated_commission', 'commission',
  ]), 'grossCommission');

  return {
    provider: 'tiktok',
    externalConversionId: requiredText(first(fixture, ['externalConversionId', 'conversionId', 'conversion_id']) ?? externalOrderId, 'conversionId'),
    externalOrderId,
    externalItemId: requiredText(first(fixture, ['externalItemId', 'itemId', 'item_id', 'productId'])
      ?? first(item, ['externalItemId', 'itemId', 'item_id', 'productId']), 'itemId'),
    modelId: optionalText(first(fixture, ['modelId', 'model_id', 'skuId', 'sku_id'])
      ?? first(item, ['modelId', 'model_id', 'skuId', 'sku_id'])),
    trackingToken: optionalText(first(fixture, ['trackingToken', 'trackingTag', 'tracking_tag', 'subId', 'sub_id', 'sub1'])),
    providerStatus,
    grossCommissionDecimal,
    netCommissionDecimal: decimal(first(fixture, [
      'netCommissionDecimal', 'netCommission', 'net_commission', 'actualCommission', 'actual_commission',
    ]) ?? grossCommissionDecimal, 'netCommission'),
    currency: 'VND',
    purchasedAt: optionalText(first(fixture, ['purchasedAt', 'purchase_time', 'purchaseTime', 'createdAt', 'created_time'])),
    completedAt: optionalText(first(fixture, ['completedAt', 'completed_time', 'completionTime', 'updatedAt', 'update_time'])),
    raw: fixture,
  };
};

/**
 * RioHub TikTok contract adapter deliberately restricted to local mock fixtures
 * or disabled mode. It accepts no credentials and contains no HTTP or network
 * behavior; a live RioHub integration remains intentionally unimplemented.
 */
export class RioHubTikTokAdapter implements CursorSyncProvider<NormalizedConversion> {
  readonly code = 'riohub-tiktok';
  readonly mode: RioHubTikTokAdapterMode;
  readonly capabilities: readonly ProviderCapability[];
  private readonly fixtures: readonly RioHubTikTokConversionFixture[];

  constructor(options: RioHubTikTokAdapterOptions = {}) {
    this.mode = options.mode ?? 'mock';
    this.capabilities = this.mode === 'mock' ? ['cursor-sync'] : [];
    this.fixtures = options.fixtures ?? rioHubTikTokConversionFixtures;
  }

  async listSyncPage(stream: string, input: { cursor?: string | null; limit?: number }) {
    if (stream !== CONVERSION_STREAM) {
      throw new OfflineFixtureAdapterError(`RioHub TikTok adapter does not support stream ${stream}.`, 'unsupported_fixture_stream');
    }
    if (this.mode === 'disabled') return { records: [], nextCursor: null };
    const page = paginateOfflineFixture(FIXTURE_NAMESPACE, this.fixtures, input);
    return { records: page.records.map(mapRioHubTikTokConversionFixture), nextCursor: page.nextCursor };
  }
}

export const rioHubTikTokConversionFixtures: readonly RioHubTikTokConversionFixture[] = Object.freeze([
  Object.freeze({
    event_id: 'RIO-TT-EVT-1001-PENDING', order_id: 'TT-ORDER-1001', item_id: 'TT-ITEM-1001', sub_id: 'link_demo_101',
    status: 1, estimated_commission: '16125', actual_commission: '0', currency: 'VND',
    purchase_time: '2026-07-01T03:00:00.000Z', update_time: '2026-07-01T03:00:00.000Z',
  }),
  Object.freeze({
    event_id: 'RIO-TT-EVT-1001-PENDING', order_id: 'TT-ORDER-1001', item_id: 'TT-ITEM-1001', sub_id: 'link_demo_101',
    status: 1, estimated_commission: '16125', actual_commission: '0', currency: 'VND',
    purchase_time: '2026-07-01T03:00:00.000Z', update_time: '2026-07-01T03:00:00.000Z', duplicate: true,
  }),
  Object.freeze({
    event_id: 'RIO-TT-EVT-1001-CONFIRMED', order_id: 'TT-ORDER-1001', item_id: 'TT-ITEM-1001', sub_id: 'link_demo_101',
    status: 2, settlement_status: 'PENDING', estimated_commission: '16125', actual_commission: '16125', currency: 'VND',
    purchase_time: '2026-07-01T03:00:00.000Z', update_time: '2026-07-03T03:00:00.000Z',
  }),
  Object.freeze({
    event_id: 'RIO-TT-EVT-1001-LATE-PENDING', order_id: 'TT-ORDER-1001', item_id: 'TT-ITEM-1001', sub_id: 'link_demo_101',
    status: 1, estimated_commission: '16125', actual_commission: '0', currency: 'VND',
    purchase_time: '2026-07-01T03:00:00.000Z', update_time: '2026-07-02T03:00:00.000Z', late_status: true,
  }),
  Object.freeze({
    event_id: 'RIO-TT-EVT-1001-SETTLED', order_id: 'TT-ORDER-1001', item_id: 'TT-ITEM-1001', sub_id: 'link_demo_101',
    status: 2, settlement_status: 'SETTLED', estimated_commission: '16125', actual_commission: '15000', currency: 'VND',
    purchase_time: '2026-07-01T03:00:00.000Z', update_time: '2026-07-08T03:00:00.000Z',
  }),
]);
