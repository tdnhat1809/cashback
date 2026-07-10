import { orderEventFixtures, productFixtures } from './fixtures.js';
import { reconcileOrderEvents } from './reconcile.js';
import type {
  CreateAffiliateLinkInput,
  MockAffiliateLink,
  MockAffiliateProvider,
  MockOrderEvent,
  MockOrderSnapshot,
  MockPlatform,
  MockProduct,
  MockProviderConfig,
  MockProviderId,
  OrderEventPageRequest,
  Page,
  PageRequest,
  ProductPageRequest,
} from './types.js';

const MOCK_WARNING = 'MOCK DATA ONLY - NOT ELIGIBLE FOR CASHBACK OR PAYMENT';
const TRACKING_SLOT = /^[A-Za-z0-9_]{1,128}$/;
const MAX_SUB_IDS = 5;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

const platformByProvider: Readonly<Record<MockProviderId, MockPlatform>> = {
  'riohub-tiktok': 'tiktok',
  lazada: 'lazada',
  tiki: 'tiki',
};

const allowedHosts: Readonly<Record<MockProviderId, readonly string[]>> = {
  'riohub-tiktok': ['tiktok.com'],
  lazada: ['lazada.vn', 'lazada.com'],
  tiki: ['tiki.vn'],
};

const validateTag = (value: string, field: string) => {
  if (!TRACKING_SLOT.test(value)) {
    throw new Error(`${field} must match [A-Za-z0-9_] and contain 1-128 characters`);
  }
};

const validateTrackingTags = (input: CreateAffiliateLinkInput) => {
  validateTag(input.trackingTag, 'trackingTag');
  const subIds = input.subIds ?? [];
  if (subIds.length > MAX_SUB_IDS) {
    throw new Error(`subIds supports at most ${MAX_SUB_IDS} slots`);
  }
  subIds.forEach((subId, index) => validateTag(subId, `subIds[${index}]`));
  return subIds;
};

const validateSourceUrl = (provider: MockProviderId, value: string) => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('sourceUrl must be a valid URL');
  }
  if (url.protocol !== 'https:') {
    throw new Error('sourceUrl must use HTTPS');
  }
  const accepted = allowedHosts[provider].some((host) =>
    url.hostname === host || url.hostname.endsWith(`.${host}`));
  if (!accepted) {
    throw new Error(`sourceUrl is not supported by ${provider}`);
  }
  url.hash = '';
  return url.toString();
};

const encodeCursor = (provider: MockProviderId, stream: string, offset: number) =>
  Buffer.from(`mock:${provider}:${stream}:${offset}`, 'utf8').toString('base64url');

const decodeCursor = (provider: MockProviderId, stream: string, cursor?: string) => {
  if (!cursor) return 0;
  let decoded: string;
  try {
    decoded = Buffer.from(cursor, 'base64url').toString('utf8');
  } catch {
    throw new Error('Invalid pagination cursor');
  }
  const prefix = `mock:${provider}:${stream}:`;
  if (!decoded.startsWith(prefix)) throw new Error('Invalid pagination cursor');
  const rawOffset = decoded.slice(prefix.length);
  if (!/^\d+$/.test(rawOffset)) throw new Error('Invalid pagination cursor');
  return Number(rawOffset);
};

const normalizeLimit = (limit?: number) => {
  const value = limit ?? DEFAULT_LIMIT;
  if (!Number.isInteger(value) || value < 1 || value > MAX_LIMIT) {
    throw new Error(`limit must be an integer between 1 and ${MAX_LIMIT}`);
  }
  return value;
};

const paginate = <T>(
  provider: MockProviderId,
  stream: string,
  items: readonly T[],
  request: PageRequest,
): Page<T> => {
  const offset = decodeCursor(provider, stream, request.cursor);
  const limit = normalizeLimit(request.limit);
  if (offset > items.length) throw new Error('Invalid pagination cursor');
  const pageItems = items.slice(offset, offset + limit);
  const nextOffset = offset + pageItems.length;
  return {
    items: pageItems,
    nextCursor: nextOffset < items.length ? encodeCursor(provider, stream, nextOffset) : null,
    total: items.length,
  };
};

class DeterministicMockAffiliateProvider implements MockAffiliateProvider {
  readonly mode = 'mock' as const;
  readonly payable = false as const;
  readonly platform: MockPlatform;

  constructor(readonly provider: MockProviderId) {
    this.platform = platformByProvider[provider];
    Object.freeze(this);
  }

  async createAffiliateLink(input: CreateAffiliateLinkInput): Promise<MockAffiliateLink> {
    const subIds = validateTrackingTags(input);
    const sourceUrl = validateSourceUrl(this.provider, input.sourceUrl);
    const output = new URL(`https://mock-affiliate.hoantienvip.local/click/${this.provider}`);
    output.searchParams.set('tag', input.trackingTag);
    subIds.forEach((subId, index) => output.searchParams.set(`sub_id_${index + 1}`, subId));
    output.searchParams.set('target', sourceUrl);
    return {
      provider: this.provider,
      platform: this.platform,
      mode: this.mode,
      payable: this.payable,
      sourceUrl,
      affiliateUrl: output.toString(),
      trackingTag: input.trackingTag,
      subIds: [...subIds],
      warning: MOCK_WARNING,
    };
  }

  async listProducts(input: ProductPageRequest = {}): Promise<Page<MockProduct>> {
    const normalizedQuery = input.query?.trim().toLocaleLowerCase('vi') ?? '';
    const items = productFixtures[this.provider].filter((product) => {
      if (input.hotDeal !== undefined && product.hotDeal !== input.hotDeal) return false;
      if (!normalizedQuery) return true;
      return `${product.name} ${product.shopName}`.toLocaleLowerCase('vi').includes(normalizedQuery);
    });
    return paginate(this.provider, `products:${normalizedQuery}:${String(input.hotDeal)}`, items, input);
  }

  async listOrderEvents(input: OrderEventPageRequest = {}): Promise<Page<MockOrderEvent>> {
    if (input.trackingTag) validateTag(input.trackingTag, 'trackingTag');
    const states = input.states ?? [];
    const items = orderEventFixtures[this.provider].filter((event) => {
      if (input.trackingTag && event.trackingTag !== input.trackingTag) return false;
      return states.length === 0 || states.includes(event.state);
    });
    const stateKey = [...states].sort().join('_');
    return paginate(
      this.provider,
      `events:${input.trackingTag ?? ''}:${stateKey}`,
      items,
      input,
    );
  }

  async listOrders(input: PageRequest = {}): Promise<Page<MockOrderSnapshot>> {
    const reconciled = reconcileOrderEvents(orderEventFixtures[this.provider]);
    return paginate(this.provider, 'orders', reconciled.orders, input);
  }
}

export const createMockAffiliateProvider = (config: MockProviderConfig): MockAffiliateProvider => {
  if (config.mode !== undefined && config.mode !== 'mock') {
    throw new Error(`Mock provider ${config.provider} cannot run in mode ${config.mode}`);
  }
  if (config.payable !== undefined && config.payable !== false) {
    throw new Error(`Mock provider ${config.provider} must keep payable=false`);
  }
  return new DeterministicMockAffiliateProvider(config.provider);
};

export const rioHubTikTokMockProvider = createMockAffiliateProvider({ provider: 'riohub-tiktok' });
export const lazadaMockProvider = createMockAffiliateProvider({ provider: 'lazada' });
export const tikiMockProvider = createMockAffiliateProvider({ provider: 'tiki' });
