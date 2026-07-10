export type CashbackStatus = 'pending' | 'confirmed' | 'paid' | 'rejected';

export interface CashbackCalculationInput {
  sourceCommissionVnd: number;
  upstreamDeductionVnd?: number;
  userShareBps: number;
  withholdingTaxBps: number;
  policyVersion: string;
}

export interface CashbackCalculation {
  policyVersion: string;
  sourceCommissionVnd: number;
  upstreamDeductionVnd: number;
  distributableCommissionVnd: number;
  userCashbackBeforeTaxVnd: number;
  withholdingTaxVnd: number;
  userCashbackPayableVnd: number;
}

const BPS = 10_000;

const assertVnd = (amount: number, label: string) => {
  if (!Number.isSafeInteger(amount) || amount < 0) throw new Error(`${label} phải là số tiền VND nguyên không âm.`);
};

const assertBps = (amount: number, label: string) => {
  if (!Number.isInteger(amount) || amount < 0 || amount > BPS) throw new Error(`${label} phải nằm trong khoảng 0–10.000 bps.`);
};

export const calculateCashback = (input: CashbackCalculationInput): CashbackCalculation => {
  const upstreamDeductionVnd = input.upstreamDeductionVnd ?? 0;
  assertVnd(input.sourceCommissionVnd, 'Hoa hồng nguồn');
  assertVnd(upstreamDeductionVnd, 'Khấu trừ nguồn');
  assertBps(input.userShareBps, 'Tỷ lệ chia cho khách hàng');
  assertBps(input.withholdingTaxBps, 'Thuế khấu trừ');
  if (!input.policyVersion.trim()) throw new Error('Phải lưu phiên bản chính sách cashback.');

  const distributableCommissionVnd = Math.max(0, input.sourceCommissionVnd - upstreamDeductionVnd);
  const userCashbackBeforeTaxVnd = Math.floor((distributableCommissionVnd * input.userShareBps) / BPS);
  const withholdingTaxVnd = Math.floor((userCashbackBeforeTaxVnd * input.withholdingTaxBps) / BPS);

  return {
    policyVersion: input.policyVersion,
    sourceCommissionVnd: input.sourceCommissionVnd,
    upstreamDeductionVnd,
    distributableCommissionVnd,
    userCashbackBeforeTaxVnd,
    withholdingTaxVnd,
    userCashbackPayableVnd: userCashbackBeforeTaxVnd - withholdingTaxVnd,
  };
};

const allowedTransitions: Record<CashbackStatus, readonly CashbackStatus[]> = {
  pending: ['confirmed', 'rejected'],
  confirmed: ['paid', 'rejected'],
  paid: [],
  rejected: [],
};

export const canTransitionCashback = (from: CashbackStatus, to: CashbackStatus) => allowedTransitions[from].includes(to);

export const assertCashbackTransition = (from: CashbackStatus, to: CashbackStatus) => {
  if (!canTransitionCashback(from, to)) throw new Error(`Không thể chuyển cashback từ ${from} sang ${to}.`);
};
