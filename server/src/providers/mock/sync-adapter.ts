import type { CursorSyncProvider } from '../types.js';
import type { MockAffiliateProvider, MockOrderEvent } from './types.js';

/**
 * Adapts the deterministic, non-payable mock event feed to the optional cursor
 * sync contract. It has no settlement, wallet, or live-provider behavior.
 */
export const createMockOrderEventSyncProvider = (
  provider: MockAffiliateProvider,
): CursorSyncProvider<MockOrderEvent> => ({
  code: provider.provider,
  mode: 'mock',
  capabilities: ['cursor-sync'],
  async listSyncPage(stream, input) {
    if (stream !== 'order-events') throw new Error(`Mock provider does not support sync stream ${stream}.`);
    const page = await provider.listOrderEvents({ cursor: input.cursor ?? undefined, limit: input.limit });
    return { records: page.items, nextCursor: page.nextCursor };
  },
});
