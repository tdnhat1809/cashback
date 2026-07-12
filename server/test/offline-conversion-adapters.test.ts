import { afterEach, describe, expect, it } from 'vitest';
import { openDatabase, type SqliteDatabase } from '../src/db/database.js';
import { ProviderSyncError, ProviderSyncService } from '../src/modules/provider-sync/ProviderSyncService.js';
import {
  mapRioHubTikTokConversionFixture,
  RioHubTikTokAdapter,
} from '../src/providers/riohub/RioHubTikTokAdapter.js';
import {
  mapShopeeConversionFixture,
  ShopeeConversionFixtureAdapter,
} from '../src/providers/shopee/ShopeeConversionFixtureAdapter.js';

const databases: SqliteDatabase[] = [];
afterEach(() => { while (databases.length) databases.pop()?.close(); });

const openTestDatabase = () => {
  const database = openDatabase(':memory:');
  databases.push(database);
  return database;
};

describe('offline conversion adapters', () => {
  it('maps Shopee fixture aliases to the normalized conversion contract', () => {
    expect(mapShopeeConversionFixture({
      conversion_id: 'SHP-CONV-MAP-1', order_id: 'SHP-ORDER-MAP-1', item_id: 'SHP-ITEM-MAP-1',
      model_id: 'SHP-MODEL-MAP-1', tracking_tag: 'link_map_1', status: 'APPROVED',
      gross_commission: '12500.50', actual_commission: '11000', currency_code: 'VND',
      purchase_time: '2026-07-01T03:00:00.000Z', completion_time: '2026-07-08T03:00:00.000Z',
    })).toMatchObject({
      provider: 'shopee', externalConversionId: 'SHP-CONV-MAP-1', externalOrderId: 'SHP-ORDER-MAP-1',
      externalItemId: 'SHP-ITEM-MAP-1', modelId: 'SHP-MODEL-MAP-1', trackingToken: 'link_map_1',
      providerStatus: 'validated', grossCommissionDecimal: '12500.50', netCommissionDecimal: '11000', currency: 'VND',
    });
  });

  it('pages Shopee conversion fixtures through ProviderSyncService without a live conversion integration', async () => {
    const database = openTestDatabase();
    const synced: string[] = [];
    const adapter = new ShopeeConversionFixtureAdapter([
      { conversion_id: 'SHP-CONV-1', order_id: 'SHP-ORDER-1', item_id: 'SHP-ITEM-1', status: 'PENDING', gross_commission: '10' },
      { conversion_id: 'SHP-CONV-2', order_id: 'SHP-ORDER-2', item_id: 'SHP-ITEM-2', status: 'COMPLETED', gross_commission: '20' },
      { conversion_id: 'SHP-CONV-3', order_id: 'SHP-ORDER-3', item_id: 'SHP-ITEM-3', status: 'FRAUD', gross_commission: '30' },
    ]);

    const result = await new ProviderSyncService(database).sync(adapter, {
      stream: 'conversions', limit: 2, processRecord: (record) => { synced.push(record.externalConversionId); },
    });

    expect(result).toMatchObject({ provider: 'shopee', mode: 'mock', pageCount: 2, recordCount: 3, cursor: null });
    expect(synced).toEqual(['SHP-CONV-1', 'SHP-CONV-2', 'SHP-CONV-3']);
    expect(database.prepare('SELECT cursor FROM sync_cursors WHERE provider = ? AND stream = ?')
      .get('shopee', 'conversions')).toEqual({ cursor: null });
  });

  it('retains RioHub duplicate and late-status fixture evidence in source order', async () => {
    const adapter = new RioHubTikTokAdapter();
    const firstPage = await adapter.listSyncPage('conversions', { limit: 4 });

    expect(firstPage.records.map((record) => record.providerStatus)).toEqual([
      'pending', 'pending', 'validated', 'pending',
    ]);
    expect(firstPage.records.map((record) => (record.raw as { event_id: string }).event_id)).toEqual([
      'RIO-TT-EVT-1001-PENDING',
      'RIO-TT-EVT-1001-PENDING',
      'RIO-TT-EVT-1001-CONFIRMED',
      'RIO-TT-EVT-1001-LATE-PENDING',
    ]);
    const duplicateRecord = firstPage.records[1];
    const lateRecord = firstPage.records[3];
    expect(duplicateRecord).toBeDefined();
    expect(lateRecord).toBeDefined();
    expect((duplicateRecord!.raw as { duplicate?: boolean }).duplicate).toBe(true);
    expect((lateRecord!.raw as { late_status?: boolean }).late_status).toBe(true);

    const secondPage = await adapter.listSyncPage('conversions', { cursor: firstPage.nextCursor, limit: 4 });
    expect(secondPage.records).toHaveLength(1);
    expect(secondPage.records[0]).toMatchObject({ providerStatus: 'completed', netCommissionDecimal: '15000' });
    expect(secondPage.nextCursor).toBeNull();
  });

  it('maps RioHub status and nested item aliases without treating the result as payable', () => {
    expect(mapRioHubTikTokConversionFixture({
      event_id: 'RIO-MAP-1', order_id: 'TT-ORDER-MAP-1', status: 2, settlement_status: 'SETTLED',
      sub1: 'link_map_2', estimated_commission: '30000', actual_commission: '27500', currency: 'VND',
      items: [{ item_id: 'TT-ITEM-MAP-1', sku_id: 'TT-SKU-MAP-1' }], update_time: '2026-07-08T03:00:00.000Z',
    })).toMatchObject({
      provider: 'tiktok', externalConversionId: 'TT-ORDER-MAP-1', externalOrderId: 'TT-ORDER-MAP-1',
      externalItemId: 'TT-ITEM-MAP-1', modelId: 'TT-SKU-MAP-1', trackingToken: 'link_map_2',
      providerStatus: 'completed', grossCommissionDecimal: '30000', netCommissionDecimal: '27500', currency: 'VND',
    });
  });

  it('keeps RioHub disabled offline and unavailable to ProviderSyncService', async () => {
    const adapter = new RioHubTikTokAdapter({ mode: 'disabled' });
    const database = openTestDatabase();

    expect(adapter.mode).toBe('disabled');
    expect(adapter.capabilities).not.toContain('cursor-sync');
    await expect(adapter.listSyncPage('conversions', { limit: 1 })).resolves.toEqual({ records: [], nextCursor: null });
    await expect(new ProviderSyncService(database).sync(adapter, { stream: 'conversions' }))
      .rejects.toMatchObject({ code: 'provider_capability_missing' } satisfies Partial<ProviderSyncError>);
  });
});
