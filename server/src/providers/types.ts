export type ProviderCode = 'shopee' | 'tiktok' | 'lazada' | 'tiki';
export type ProviderMode = 'live' | 'dynamic' | 'mock' | 'disabled';

export interface TrackingLinkInput {
  destinationUrl: string;
  clickToken: string;
  channel?: string;
  campaignToken?: string;
}

export interface TrackingLinkResult {
  provider: ProviderCode;
  mode: ProviderMode;
  destinationUrl: string;
  providerUrl: string;
  attributionToken: string;
  payable: boolean;
  raw?: unknown;
}

export interface ProductOffer {
  provider: ProviderCode;
  externalItemId: string;
  externalShopId?: string;
  name: string;
  shopName?: string;
  imageUrl?: string;
  productUrl: string;
  offerUrl?: string;
  priceMinDecimal: string;
  priceMaxDecimal: string;
  commissionRateDecimal?: string;
  commissionDecimal?: string;
  raw: unknown;
}

export interface NormalizedConversion {
  provider: ProviderCode;
  externalConversionId: string;
  externalOrderId: string;
  externalItemId: string;
  modelId?: string;
  trackingToken?: string;
  providerStatus: 'pending' | 'completed' | 'cancelled' | 'fraud' | 'validated';
  grossCommissionDecimal: string;
  netCommissionDecimal: string;
  currency: 'VND';
  purchasedAt?: string;
  completedAt?: string;
  raw: unknown;
}

export interface ProviderHealth {
  provider: ProviderCode;
  mode: ProviderMode;
  healthy: boolean;
  message: string;
  checkedAt: string;
}

/**
 * The legacy base contract intentionally stays minimal. Providers can opt into
 * additional capabilities without forcing existing tracking-only providers to
 * implement unrelated operations.
 */
export interface AffiliateProvider {
  readonly code: ProviderCode;
  readonly mode: ProviderMode;
  createTrackingLink(input: TrackingLinkInput): Promise<TrackingLinkResult>;
  healthCheck(): Promise<ProviderHealth>;
}

export type ProviderCapability = 'cursor-sync' | 'webhooks' | 'product-offers' | 'settlements';

export interface ProviderCapabilities {
  /** Omit this property for legacy providers; capability checks then return false. */
  readonly capabilities?: readonly ProviderCapability[];
}

export interface CursorSyncRequest {
  cursor?: string | null;
  limit?: number;
}

export interface CursorSyncPage<TRecord = unknown> {
  records: readonly TRecord[];
  nextCursor: string | null;
}

/**
 * Optional polling extension for providers that expose a cursor-based feed.
 * It deliberately does not imply that records are payable or that a live
 * integration exists.
 */
export interface CursorSyncProvider<TRecord = unknown> extends ProviderCapabilities {
  readonly code: string;
  readonly mode: ProviderMode;
  listSyncPage(stream: string, input: CursorSyncRequest): Promise<CursorSyncPage<TRecord>>;
}

export const hasProviderCapability = (
  provider: ProviderCapabilities,
  capability: ProviderCapability,
): boolean => provider.capabilities?.includes(capability) ?? false;

export const isCursorSyncProvider = (provider: ProviderCapabilities): provider is CursorSyncProvider =>
  hasProviderCapability(provider, 'cursor-sync')
  && 'listSyncPage' in provider
  && typeof provider.listSyncPage === 'function';
