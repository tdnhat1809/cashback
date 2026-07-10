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

export interface AffiliateProvider {
  readonly code: ProviderCode;
  readonly mode: ProviderMode;
  createTrackingLink(input: TrackingLinkInput): Promise<TrackingLinkResult>;
  healthCheck(): Promise<ProviderHealth>;
}
