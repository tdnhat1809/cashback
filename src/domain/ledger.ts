export type LedgerEntryType = 'cashback_settled' | 'cashback_reversal' | 'referral_bonus' | 'withdrawal_requested' | 'withdrawal_paid' | 'withdrawal_rejected';

export interface LedgerEntryDraft {
  id: string;
  idempotencyKey: string;
  type: LedgerEntryType;
  amountVnd: number;
  occurredAt: string;
  description: string;
  referenceId: string;
  policyVersion?: string;
}

export interface LedgerEntry extends LedgerEntryDraft {
  balanceAfterVnd: number;
}

const assertSignedVnd = (amount: number) => {
  if (!Number.isSafeInteger(amount) || amount === 0) throw new Error('Bút toán phải có số tiền VND nguyên khác 0.');
};

export const getLedgerBalance = (entries: readonly LedgerEntry[]) => entries.reduce((total, entry) => total + entry.amountVnd, 0);

export const appendLedgerEntry = (entries: readonly LedgerEntry[], draft: LedgerEntryDraft): LedgerEntry[] => {
  assertSignedVnd(draft.amountVnd);
  if (!draft.idempotencyKey.trim()) throw new Error('Bút toán phải có idempotency key.');
  if (entries.some((entry) => entry.idempotencyKey === draft.idempotencyKey)) {
    throw new Error('Bút toán đã được ghi nhận trước đó.');
  }
  const balanceAfterVnd = getLedgerBalance(entries) + draft.amountVnd;
  return [...entries, { ...draft, balanceAfterVnd }];
};
