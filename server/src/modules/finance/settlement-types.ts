export type SettlementStage = 'pending' | 'validated' | 'settled' | 'rejected';

export interface SettlementImportItem {
  externalConversionId: string;
  externalOrderId: string;
  externalItemId: string;
  modelId: string;
  trackingTag?: string;
  category: string;
  actualCommissionVnd: number;
  orderValueVnd: number;
  stage: SettlementStage;
  purchasedAt?: string;
  itemName?: string;
  imageUrl?: string;
}

export interface SettlementImport {
  platform: 'shopee';
  externalValidationId: string;
  observedAt: string;
  grossCommissionVnd: number;
  mcnFeeVnd: number;
  providerServiceFeeVnd: number;
  taxWithheldVnd?: number;
  items: SettlementImportItem[];
  rawPayload: unknown;
}

export interface SettlementImportResult {
  reportId: string;
  syncRunId: string;
  idempotentReplay: boolean;
  status: 'reconciled';
  policyVersion: string;
  grossCommissionVnd: number;
  taxWithheldVnd: number;
  distributableNetVnd: number;
  cashbackVnd: number;
  matchedItems: number;
  unmatchedItems: number;
}

