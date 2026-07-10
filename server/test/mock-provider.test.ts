import { describe, expect, it, vi } from 'vitest';
import {
  createMockAffiliateProvider,
  lazadaMockProvider,
  orderEventFixtures,
  reconcileOrderEvents,
  rioHubTikTokMockProvider,
  tikiMockProvider,
  type MockOrderEvent,
} from '../src/providers/mock/index.js';

describe('deterministic mock affiliate providers', () => {
  it('hard-locks mock mode and payable=false', () => {
    expect(rioHubTikTokMockProvider.mode).toBe('mock');
    expect(rioHubTikTokMockProvider.payable).toBe(false);
    expect(Object.isFrozen(rioHubTikTokMockProvider)).toBe(true);
    expect(() => createMockAffiliateProvider({ provider: 'lazada', mode: 'live' })).toThrow(/cannot run/i);
    expect(() => createMockAffiliateProvider({ provider: 'tiki', payable: true })).toThrow(/payable=false/i);
  });

  it('creates stable, non-payable links with opaque tracking slots', async () => {
    const input = {
      sourceUrl: 'https://shop.tiktok.com/view/product/1720000000001001#reviews',
      trackingTag: 'user_42_campaign_7',
      subIds: ['home_hero', 'slot_02'],
    } as const;
    const first = await rioHubTikTokMockProvider.createAffiliateLink(input);
    const second = await rioHubTikTokMockProvider.createAffiliateLink(input);

    expect(first).toEqual(second);
    expect(first.payable).toBe(false);
    expect(first.sourceUrl).not.toContain('#reviews');
    expect(first.affiliateUrl).toContain('tag=user_42_campaign_7');
    expect(first.warning).toMatch(/mock data only/i);
  });

  it.each([
    ['bad-hyphen'],
    ['có_dấu'],
    ['x'.repeat(129)],
    [''],
  ])('rejects invalid tracking slot %s', async (trackingTag) => {
    await expect(rioHubTikTokMockProvider.createAffiliateLink({
      sourceUrl: 'https://www.tiktok.com/view/product/1720000000001001',
      trackingTag,
    })).rejects.toThrow(/A-Za-z0-9_/);
  });

  it('rejects unsafe schemes and a source from the wrong platform', async () => {
    await expect(tikiMockProvider.createAffiliateLink({
      sourceUrl: 'http://tiki.vn/san-pham-p3001.html',
      trackingTag: 'valid_tag',
    })).rejects.toThrow(/HTTPS/);
    await expect(lazadaMockProvider.createAffiliateLink({
      sourceUrl: 'https://tiki.vn/san-pham-p3001.html',
      trackingTag: 'valid_tag',
    })).rejects.toThrow(/not supported/);
  });

  it('paginates products with provider- and filter-bound cursors', async () => {
    const first = await rioHubTikTokMockProvider.listProducts({ limit: 2 });
    expect(first.items).toHaveLength(2);
    expect(first.total).toBe(5);
    expect(first.nextCursor).not.toBeNull();

    const second = await rioHubTikTokMockProvider.listProducts({
      limit: 2,
      cursor: first.nextCursor ?? undefined,
    });
    expect(second.items).toHaveLength(2);
    expect(second.items[0]?.externalItemId).not.toBe(first.items[0]?.externalItemId);

    await expect(lazadaMockProvider.listProducts({
      cursor: first.nextCursor ?? undefined,
    })).rejects.toThrow(/cursor/i);
    await expect(rioHubTikTokMockProvider.listProducts({
      cursor: first.nextCursor ?? undefined,
      hotDeal: true,
    })).rejects.toThrow(/cursor/i);
  });

  it('filters deterministic products and order events without network calls', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    try {
      const products = await tikiMockProvider.listProducts({ query: 'sách' });
      const events = await lazadaMockProvider.listOrderEvents({ states: ['confirmed'] });
      expect(products.items.map((product) => product.externalItemId)).toEqual(['TIKI-ITEM-3001']);
      expect(events.items.map((event) => event.eventId)).toEqual(['LZD_EVT_2001_CONFIRMED']);
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });
});

describe('mock order reconciliation', () => {
  it('ignores duplicates and stale out-of-order events deterministically', () => {
    const result = reconcileOrderEvents(orderEventFixtures['riohub-tiktok']);
    expect(result.orders.map((order) => [order.externalOrderId, order.state])).toEqual([
      ['TT_ORDER_1001', 'paid'],
      ['TT_ORDER_1002', 'rejected'],
    ]);
    expect(result.ignoredEvents).toEqual([
      { eventId: 'TT_EVT_1001_PENDING', externalOrderId: 'TT_ORDER_1001', reason: 'duplicate' },
      { eventId: 'TT_EVT_1002_LATE_PENDING', externalOrderId: 'TT_ORDER_1002', reason: 'stale' },
    ]);
  });

  it('rejects a forward-dated transition out of a paid terminal state', () => {
    const invalid: MockOrderEvent = {
      ...orderEventFixtures['riohub-tiktok'][0]!,
      eventId: 'TT_EVT_1001_ROLLBACK',
      state: 'pending',
      occurredAt: '2026-07-09T03:00:00.000Z',
      receivedSequence: 8,
      scenario: 'out_of_order',
    };
    const result = reconcileOrderEvents([...orderEventFixtures['riohub-tiktok'], invalid]);
    expect(result.orders.find((order) => order.externalOrderId === 'TT_ORDER_1001')?.state).toBe('paid');
    expect(result.ignoredEvents.at(-1)?.reason).toBe('invalid_transition');
  });

  it('exposes reconciled order snapshots through paginated providers', async () => {
    const first = await rioHubTikTokMockProvider.listOrders({ limit: 1 });
    const second = await rioHubTikTokMockProvider.listOrders({
      limit: 1,
      cursor: first.nextCursor ?? undefined,
    });
    expect(first.items).toHaveLength(1);
    expect(second.items).toHaveLength(1);
    expect(second.nextCursor).toBeNull();
  });
});
