import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import {
  normalizeShopeeDestination,
  ShopeeAffiliateProvider,
  signShopeePayload,
} from '../src/providers/shopee/ShopeeAffiliateProvider.js';

describe('ShopeeAffiliateProvider', () => {
  it('normalizes only HTTPS Shopee Vietnam URLs', () => {
    expect(normalizeShopeeDestination('https://shopee.vn/product-i.1.2#details')).toBe('https://shopee.vn/product-i.1.2');
    expect(() => normalizeShopeeDestination('https://shopee.vn.evil.test/product')).toThrow(/tên miền/i);
    expect(() => normalizeShopeeDestination('http://shopee.vn/product')).toThrow(/HTTPS/i);
  });

  it('signs the exact JSON payload bytes', () => {
    const payload = JSON.stringify({ query: 'query { ping }' });
    const expected = createHash('sha256').update(`app123${1_700_000_000}${payload}secret456`).digest('hex');
    expect(signShopeePayload('app123', 1_700_000_000, payload, 'secret456')).toBe(expected);
  });

  it('creates official dynamic redirect links without exposing a secret', async () => {
    const provider = new ShopeeAffiliateProvider({
      mode: 'dynamic', endpoint: 'https://open-api.affiliate.shopee.vn/graphql', affiliateId: 'affiliate-123',
      appId: '', secret: '', timeoutMs: 1000,
    });
    const result = await provider.createTrackingLink({
      destinationUrl: 'https://shopee.vn/product-i.1.2', clickToken: 'abc12345_test',
    });
    const redirect = new URL(result.providerUrl);
    expect(redirect.hostname).toBe('s.shopee.vn');
    expect(redirect.searchParams.get('affiliate_id')).toBe('affiliate-123');
    expect(redirect.searchParams.get('sub_id')).toBe('abc12345_test');
    expect(result.payable).toBe(true);
  });

  it('uses the same payload for signature and HTTP body', async () => {
    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = String(init?.body);
      const timestamp = 1_700_000_000;
      const expectedSignature = signShopeePayload('app123', timestamp, body, 'secret456');
      expect(new Headers(init?.headers).get('authorization')).toContain(`Signature=${expectedSignature}`);
      return new Response(JSON.stringify({ data: { generateShortLink: { shortLink: 'https://s.shopee.vn/short' } } }), {
        status: 200, headers: { 'content-type': 'application/json' },
      });
    });
    const provider = new ShopeeAffiliateProvider({
      mode: 'graphql', endpoint: 'https://open-api.affiliate.shopee.vn/graphql', affiliateId: '',
      appId: 'app123', secret: 'secret456', timeoutMs: 1000, fetchImplementation: fetchMock, now: () => 1_700_000_000_000,
    });
    const result = await provider.createTrackingLink({ destinationUrl: 'https://shopee.vn/i.1.2', clickToken: 'opaque_token_123' });
    expect(result.providerUrl).toBe('https://s.shopee.vn/short');
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
