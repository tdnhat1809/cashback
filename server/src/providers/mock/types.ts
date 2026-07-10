export type MockProviderId = 'riohub-tiktok' | 'lazada' | 'tiki';

export type MockPlatform = 'tiktok' | 'lazada' | 'tiki';

export type MockOrderState = 'pending' | 'confirmed' | 'rejected' | 'paid';

export type MockEventScenario = 'normal' | 'duplicate' | 'out_of_order';

export interface MockProviderConfig {
  provider: MockProviderId;
  mode?: string;
  payable?: boolean;
}

export interface TrackingTags {
  trackingTag: string;
  subIds?: readonly string[];
}

export interface CreateAffiliateLinkInput extends TrackingTags {
  sourceUrl: string;
}

export interface MockAffiliateLink {
  provider: MockProviderId;
  platform: MockPlatform;
  mode: 'mock';
  payable: false;
  sourceUrl: string;
  affiliateUrl: string;
  trackingTag: string;
  subIds: readonly string[];
  warning: string;
}

export interface MockProduct {
  provider: MockProviderId;
  platform: MockPlatform;
  externalItemId: string;
  externalShopId: string;
  name: string;
  shopName: string;
  imageUrl: string;
  sourceUrl: string;
  priceVnd: number;
  originalPriceVnd: number;
  commissionRateBps: number;
  hotDeal: boolean;
}

export interface MockOrderItem {
  externalItemId: string;
  name: string;
  quantity: number;
  amountVnd: number;
  commissionVnd: number;
}

export interface MockOrderEvent {
  provider: MockProviderId;
  platform: MockPlatform;
  eventId: string;
  externalOrderId: string;
  trackingTag: string;
  state: MockOrderState;
  orderValueVnd: number;
  grossCommissionVnd: number;
  occurredAt: string;
  receivedSequence: number;
  scenario: MockEventScenario;
  items: readonly MockOrderItem[];
}

export interface MockOrderSnapshot {
  provider: MockProviderId;
  platform: MockPlatform;
  externalOrderId: string;
  trackingTag: string;
  state: MockOrderState;
  orderValueVnd: number;
  grossCommissionVnd: number;
  lastEventId: string;
  lastOccurredAt: string;
  items: readonly MockOrderItem[];
}

export type IgnoredEventReason = 'duplicate' | 'stale' | 'invalid_transition';

export interface IgnoredOrderEvent {
  eventId: string;
  externalOrderId: string;
  reason: IgnoredEventReason;
}

export interface ReconcileOrderEventsResult {
  orders: readonly MockOrderSnapshot[];
  ignoredEvents: readonly IgnoredOrderEvent[];
}

export interface PageRequest {
  cursor?: string;
  limit?: number;
}

export interface ProductPageRequest extends PageRequest {
  query?: string;
  hotDeal?: boolean;
}

export interface OrderEventPageRequest extends PageRequest {
  trackingTag?: string;
  states?: readonly MockOrderState[];
}

export interface Page<T> {
  items: readonly T[];
  nextCursor: string | null;
  total: number;
}

export interface MockAffiliateProvider {
  readonly provider: MockProviderId;
  readonly platform: MockPlatform;
  readonly mode: 'mock';
  readonly payable: false;
  createAffiliateLink(input: CreateAffiliateLinkInput): Promise<MockAffiliateLink>;
  listProducts(input?: ProductPageRequest): Promise<Page<MockProduct>>;
  listOrderEvents(input?: OrderEventPageRequest): Promise<Page<MockOrderEvent>>;
  listOrders(input?: PageRequest): Promise<Page<MockOrderSnapshot>>;
}
