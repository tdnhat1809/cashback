import { paginateOfflineFixture, OfflineFixtureAdapterError } from '../conversions/fixture-pagination.js';
import type { CursorSyncProvider, NormalizedConversion } from '../types.js';

const CONVERSION_STREAM = 'conversions';
const FIXTURE_NAMESPACE = 'shopee-conversions';

export type ShopeeConversionFixture = Readonly<Record<string, unknown>>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const first = (record: Record<string, unknown>, keys: readonly string[]): unknown => {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
};

const requiredText = (value: unknown, field: string): string => {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  throw new OfflineFixtureAdapterError(`Shopee fixture field ${field} is required.`, 'invalid_shopee_conversion_fixture');
};

const optionalText = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
};

const decimal = (value: unknown, field: string): string => {
  const result = optionalText(value);
  if (!result || !/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(result)) {
    throw new OfflineFixtureAdapterError(
      `Shopee fixture field ${field} must be a non-negative decimal string.`,
      'invalid_shopee_conversion_fixture',
    );
  }
  return result;
};

/** Maps only documented local fixtures into the normalized conversion contract. */
export const mapShopeeConversionFixture = (fixture: unknown): NormalizedConversion => {
  if (!isRecord(fixture)) {
    throw new OfflineFixtureAdapterError('Shopee conversion fixture must be an object.', 'invalid_shopee_conversion_fixture');
  }
  const status = String(first(fixture, ['status', 'conversionStatus', 'conversion_status']) ?? '')
    .trim().toLowerCase().replaceAll(/[^a-z0-9]+/g, '_');
  const providerStatus: NormalizedConversion['providerStatus'] = (() => {
    if (['pending', 'processing', 'estimated', 'created', 'open'].includes(status)) return 'pending';
    if (['validated', 'approved', 'confirmed', 'validation_passed'].includes(status)) return 'validated';
    if (['completed', 'settled', 'paid', 'payable'].includes(status)) return 'completed';
    if (['fraud', 'fraudulent'].includes(status)) return 'fraud';
    if (['cancelled', 'canceled', 'rejected', 'invalid', 'void', 'refunded'].includes(status)) return 'cancelled';
    throw new OfflineFixtureAdapterError(`Unsupported Shopee fixture status: ${status || '(empty)'}.`, 'unsupported_shopee_conversion_status');
  })();
  const currency = String(first(fixture, ['currency', 'currencyCode', 'currency_code']) ?? 'VND').trim().toUpperCase();
  if (currency !== 'VND') {
    throw new OfflineFixtureAdapterError('Shopee conversion fixtures must use VND.', 'unsupported_shopee_conversion_currency');
  }
  const grossCommissionDecimal = decimal(first(fixture, [
    'grossCommissionDecimal', 'grossCommission', 'gross_commission', 'estimatedCommission', 'commission',
  ]), 'grossCommission');

  return {
    provider: 'shopee',
    externalConversionId: requiredText(first(fixture, ['externalConversionId', 'conversionId', 'conversion_id']), 'conversionId'),
    externalOrderId: requiredText(first(fixture, ['externalOrderId', 'orderId', 'order_id']), 'orderId'),
    externalItemId: requiredText(first(fixture, ['externalItemId', 'itemId', 'item_id', 'productId']), 'itemId'),
    modelId: optionalText(first(fixture, ['modelId', 'model_id', 'variationId'])),
    trackingToken: optionalText(first(fixture, ['trackingToken', 'trackingTag', 'tracking_tag', 'subId', 'sub_id'])),
    providerStatus,
    grossCommissionDecimal,
    netCommissionDecimal: decimal(first(fixture, [
      'netCommissionDecimal', 'netCommission', 'net_commission', 'actualCommission', 'actual_commission',
    ]) ?? grossCommissionDecimal, 'netCommission'),
    currency: 'VND',
    purchasedAt: optionalText(first(fixture, ['purchasedAt', 'purchaseTime', 'purchase_time', 'createdAt'])),
    completedAt: optionalText(first(fixture, ['completedAt', 'completionTime', 'completion_time', 'updatedAt'])),
    raw: fixture,
  };
};

/**
 * Contract-ready, local fixture adapter for Shopee conversion mappings. This is
 * deliberately mock-only: it has no endpoint, credentials, fetch dependency,
 * or live Shopee conversion synchronization behavior.
 */
export class ShopeeConversionFixtureAdapter implements CursorSyncProvider<NormalizedConversion> {
  readonly code = 'shopee';
  readonly mode = 'mock' as const;
  readonly capabilities = ['cursor-sync'] as const;

  constructor(private readonly fixtures: readonly ShopeeConversionFixture[] = shopeeConversionFixtures) {}

  async listSyncPage(stream: string, input: { cursor?: string | null; limit?: number }) {
    if (stream !== CONVERSION_STREAM) {
      throw new OfflineFixtureAdapterError(`Shopee fixture adapter does not support stream ${stream}.`, 'unsupported_fixture_stream');
    }
    const page = paginateOfflineFixture(FIXTURE_NAMESPACE, this.fixtures, input);
    return { records: page.records.map(mapShopeeConversionFixture), nextCursor: page.nextCursor };
  }
}

export const shopeeConversionFixtures: readonly ShopeeConversionFixture[] = Object.freeze([
  Object.freeze({
    conversion_id: 'SHP-CONV-1001', order_id: 'SHP-ORDER-1001', item_id: 'SHP-ITEM-1001', model_id: 'SHP-MODEL-1001',
    sub_id: 'link_demo_001', status: 'PENDING', gross_commission: '12500', actual_commission: '0', currency: 'VND',
    purchase_time: '2026-07-01T03:00:00.000Z', updated_at: '2026-07-01T03:00:00.000Z',
  }),
  Object.freeze({
    conversion_id: 'SHP-CONV-1002', order_id: 'SHP-ORDER-1002', item_id: 'SHP-ITEM-1002',
    tracking_tag: 'link_demo_002', status: 'APPROVED', estimatedCommission: '32000', net_commission: '28750',
    currency_code: 'VND', purchaseTime: '2026-07-03T04:00:00.000Z', completion_time: '2026-07-08T04:00:00.000Z',
  }),
]);
