import { createHash } from 'node:crypto';

export interface MockPayoutInstruction {
  batchId: string;
  batchReference: string;
  itemId: string;
  withdrawalRequestId: string;
  amountVnd: number;
}

export interface MockPayoutReceipt {
  gateway: 'deterministic_mock';
  reference: string;
  status: 'accepted';
  realBankActivity: false;
}

/**
 * A deterministic, side-effect-free stand-in for an offline payout file.
 * It never opens a network connection, stores bank credentials, or confirms
 * that money moved. The reference is only useful for exercising reconciliation.
 */
export class DeterministicMockPayoutGateway {
  submit(instruction: MockPayoutInstruction): MockPayoutReceipt {
    const fingerprint = [
      instruction.batchId,
      instruction.batchReference,
      instruction.itemId,
      instruction.withdrawalRequestId,
      instruction.amountVnd,
    ].join('|');
    const digest = createHash('sha256').update(fingerprint).digest('hex').slice(0, 20).toUpperCase();
    return {
      gateway: 'deterministic_mock',
      reference: `MOCK-PAYOUT-${digest}`,
      status: 'accepted',
      realBankActivity: false,
    };
  }

  reconcile(instruction: MockPayoutInstruction, reference: string): MockPayoutReceipt | null {
    const receipt = this.submit(instruction);
    return receipt.reference === reference ? receipt : null;
  }
}
