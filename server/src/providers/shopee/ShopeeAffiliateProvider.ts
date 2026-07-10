import { createHash } from 'node:crypto';
import type { AppConfig } from '../../config.js';
import {
  ProviderAuthenticationError,
  ProviderConfigurationError,
  ProviderError,
  ProviderRateLimitError,
  ProviderSchemaError,
  ProviderTemporaryError,
} from '../errors.js';
import type { AffiliateProvider, ProductOffer, ProviderHealth, TrackingLinkInput, TrackingLinkResult } from '../types.js';

interface GraphqlEnvelope<T> {
  data?: T;
  errors?: Array<{ message?: string; extensions?: { code?: string | number } }>;
}

export interface ShopeeProviderOptions {
  endpoint: string;
  mode: 'disabled' | 'dynamic' | 'graphql';
  affiliateId: string;
  appId: string;
  secret: string;
  timeoutMs: number;
  fetchImplementation?: typeof fetch;
  now?: () => number;
}

const allowedShopeeHosts = ['shopee.vn', 'shp.ee', 's.shopee.vn'];
const isAllowedHost = (host: string) => allowedShopeeHosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));

export const normalizeShopeeDestination = (value: string) => {
  let url: URL;
  try { url = new URL(value.trim()); } catch { throw new ProviderError('Link Shopee không hợp lệ.', 'invalid_destination_url', false, 422); }
  if (url.protocol !== 'https:') throw new ProviderError('Link Shopee phải sử dụng HTTPS.', 'invalid_destination_protocol', false, 422);
  if (url.username || url.password || !isAllowedHost(url.hostname.toLowerCase())) {
    throw new ProviderError('Tên miền không thuộc Shopee Việt Nam.', 'invalid_destination_host', false, 422);
  }
  url.hash = '';
  return url.toString();
};

export const signShopeePayload = (appId: string, timestamp: number, payload: string, secret: string) =>
  createHash('sha256').update(`${appId}${timestamp}${payload}${secret}`, 'utf8').digest('hex');

const escapeGraphqlString = (value: string) => JSON.stringify(value);

export class ShopeeAffiliateProvider implements AffiliateProvider {
  readonly code = 'shopee' as const;
  readonly mode: 'live' | 'dynamic' | 'disabled';
  private readonly fetchImplementation: typeof fetch;
  private readonly now: () => number;

  constructor(private readonly options: ShopeeProviderOptions) {
    this.mode = options.mode === 'graphql' ? 'live' : options.mode;
    this.fetchImplementation = options.fetchImplementation ?? fetch;
    this.now = options.now ?? (() => Date.now());
  }

  static fromConfig(config: AppConfig) {
    return new ShopeeAffiliateProvider({
      endpoint: config.SHOPEE_AFFILIATE_ENDPOINT,
      mode: config.SHOPEE_AFFILIATE_MODE,
      affiliateId: config.SHOPEE_AFFILIATE_ID,
      appId: config.SHOPEE_AFFILIATE_APP_ID,
      secret: config.SHOPEE_AFFILIATE_SECRET,
      timeoutMs: config.SHOPEE_REQUEST_TIMEOUT_MS,
    });
  }

  async createTrackingLink(input: TrackingLinkInput): Promise<TrackingLinkResult> {
    const destinationUrl = normalizeShopeeDestination(input.destinationUrl);
    if (!/^[A-Za-z0-9_]{8,64}$/.test(input.clickToken)) {
      throw new ProviderError('Tracking token không hợp lệ.', 'invalid_tracking_token', false, 422);
    }
    if (this.options.mode === 'disabled') throw new ProviderConfigurationError('Shopee Affiliate chưa được bật.');

    if (this.options.mode === 'dynamic') {
      if (!this.options.affiliateId) throw new ProviderConfigurationError('Thiếu SHOPEE_AFFILIATE_ID.');
      const url = new URL('https://s.shopee.vn/an_redir');
      url.searchParams.set('origin_link', destinationUrl);
      url.searchParams.set('affiliate_id', this.options.affiliateId);
      url.searchParams.set('sub_id', input.clickToken);
      return { provider: this.code, mode: 'dynamic', destinationUrl, providerUrl: url.toString(), attributionToken: input.clickToken, payable: true };
    }

    const query = `mutation { generateShortLink(input: { originUrl: ${escapeGraphqlString(destinationUrl)}, subIds: [${escapeGraphqlString(input.clickToken)}] }) { shortLink } }`;
    const response = await this.execute<{ generateShortLink?: { shortLink?: string } }>(query);
    const shortLink = response.generateShortLink?.shortLink;
    if (!shortLink) throw new ProviderSchemaError('Shopee không trả về shortLink.');
    return { provider: this.code, mode: 'live', destinationUrl, providerUrl: shortLink, attributionToken: input.clickToken, payable: true, raw: response };
  }

  async listProductOffers(input: { keyword?: string; page?: number; limit?: number } = {}): Promise<ProductOffer[]> {
    const args = [
      input.keyword ? `keyword: ${escapeGraphqlString(input.keyword)}` : '',
      `page: ${Math.max(1, input.page ?? 1)}`,
      `limit: ${Math.min(100, Math.max(1, input.limit ?? 20))}`,
    ].filter(Boolean).join(', ');
    const query = `query { productOfferV2(${args}) { nodes { itemId shopId productName shopName imageUrl productLink offerLink priceMin priceMax commissionRate commission } pageInfo { hasNextPage } } }`;
    const response = await this.execute<{ productOfferV2?: { nodes?: Array<Record<string, unknown>> } }>(query);
    return (response.productOfferV2?.nodes ?? []).map((node) => ({
      provider: this.code,
      externalItemId: String(node.itemId ?? ''),
      externalShopId: node.shopId == null ? undefined : String(node.shopId),
      name: String(node.productName ?? ''),
      shopName: node.shopName == null ? undefined : String(node.shopName),
      imageUrl: node.imageUrl == null ? undefined : String(node.imageUrl),
      productUrl: String(node.productLink ?? ''),
      offerUrl: node.offerLink == null ? undefined : String(node.offerLink),
      priceMinDecimal: String(node.priceMin ?? '0'),
      priceMaxDecimal: String(node.priceMax ?? '0'),
      commissionRateDecimal: node.commissionRate == null ? undefined : String(node.commissionRate),
      commissionDecimal: node.commission == null ? undefined : String(node.commission),
      raw: node,
    }));
  }

  async healthCheck(): Promise<ProviderHealth> {
    if (this.options.mode === 'disabled') return { provider: this.code, mode: this.mode, healthy: false, message: 'Shopee Affiliate disabled', checkedAt: new Date().toISOString() };
    const configured = this.options.mode === 'dynamic'
      ? Boolean(this.options.affiliateId)
      : Boolean(this.options.appId && this.options.secret);
    return { provider: this.code, mode: this.mode, healthy: configured, message: configured ? 'Configured' : 'Missing credentials', checkedAt: new Date().toISOString() };
  }

  async execute<T>(query: string): Promise<T> {
    if (!this.options.appId || !this.options.secret) throw new ProviderConfigurationError('Thiếu Shopee app ID hoặc secret.');
    const payload = JSON.stringify({ query });
    const timestamp = Math.floor(this.now() / 1000);
    const signature = signShopeePayload(this.options.appId, timestamp, payload, this.options.secret);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs);
    try {
      const response = await this.fetchImplementation(this.options.endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `SHA256 Credential=${this.options.appId}, Timestamp=${timestamp}, Signature=${signature}`,
        },
        body: payload,
        signal: controller.signal,
      });
      const retryAfter = Number(response.headers.get('retry-after') ?? '') || undefined;
      if (response.status === 429) throw new ProviderRateLimitError('Shopee rate limit exceeded.', retryAfter);
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) throw new ProviderAuthenticationError(`Shopee authentication failed (${response.status}).`);
        if (response.status >= 500) throw new ProviderTemporaryError(`Shopee unavailable (${response.status}).`);
        throw new ProviderError(`Shopee request failed (${response.status}).`, 'provider_request_failed', false, 502);
      }
      const envelope = await response.json() as GraphqlEnvelope<T>;
      if (envelope.errors?.length) {
        const errorCode = String(envelope.errors[0]?.extensions?.code ?? '');
        const message = envelope.errors.map((error) => error.message).filter(Boolean).join('; ') || 'Shopee GraphQL error';
        if (errorCode === '10020' || /^1003[1-5]$/.test(errorCode)) throw new ProviderAuthenticationError(message);
        if (errorCode === '10030') throw new ProviderRateLimitError(message);
        throw new ProviderError(message, `shopee_${errorCode || 'graphql_error'}`, false, 502);
      }
      if (!envelope.data) throw new ProviderSchemaError('Shopee response thiếu data.');
      return envelope.data;
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      if (error instanceof Error && error.name === 'AbortError') throw new ProviderTemporaryError('Shopee request timeout.');
      throw new ProviderTemporaryError(error instanceof Error ? error.message : 'Shopee network error.');
    } finally {
      clearTimeout(timeout);
    }
  }
}
