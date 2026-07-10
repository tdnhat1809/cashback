import { afterEach, describe, expect, it } from 'vitest';
import { openDatabase, type SqliteDatabase } from '../src/db/database.js';
import { ProviderSyncError, ProviderSyncService } from '../src/modules/provider-sync/ProviderSyncService.js';
import { createMockOrderEventSyncProvider, rioHubTikTokMockProvider } from '../src/providers/mock/index.js';
import type { CursorSyncProvider } from '../src/providers/types.js';

const databases: SqliteDatabase[] = [];
afterEach(() => { while (databases.length) databases.pop()?.close(); });

const openTestDatabase = () => {
  const database = openDatabase(':memory:');
  databases.push(database);
  return database;
};

describe('ProviderSyncService', () => {
  it('persists paged mock sync progress and records a completed run', async () => {
    const database = openTestDatabase();
    const service = new ProviderSyncService(database);
    const calls: Array<string | null> = [];
    const processed: string[] = [];
    const provider: CursorSyncProvider<{ id: string }> = {
      code: 'mock-events',
      mode: 'mock',
      capabilities: ['cursor-sync'],
      async listSyncPage(_stream, input) {
        calls.push(input.cursor ?? null);
        return input.cursor === 'page-2'
          ? { records: [{ id: 'event-3' }], nextCursor: null }
          : { records: [{ id: 'event-1' }, { id: 'event-2' }], nextCursor: 'page-2' };
      },
    };

    const result = await service.sync(provider, {
      stream: 'orders',
      processRecord: (record) => { processed.push(record.id); },
    });

    expect(result).toMatchObject({ mode: 'mock', pageCount: 2, recordCount: 3, cursor: null });
    expect(calls).toEqual([null, 'page-2']);
    expect(processed).toEqual(['event-1', 'event-2', 'event-3']);
    expect(database.prepare('SELECT cursor FROM sync_cursors WHERE provider = ? AND stream = ?')
      .get('mock-events', 'orders')).toEqual({ cursor: null });
    expect(database.prepare('SELECT status, page_count, record_count FROM provider_sync_runs WHERE id = ?')
      .get(result.id)).toEqual({ status: 'completed', page_count: 2, record_count: 3 });
  });

  it('adapts the deterministic non-payable mock event feed without a live integration', async () => {
    const database = openTestDatabase();
    const service = new ProviderSyncService(database);
    const eventIds: string[] = [];

    const result = await service.sync(createMockOrderEventSyncProvider(rioHubTikTokMockProvider), {
      stream: 'order-events', limit: 2, processRecord: (event) => { eventIds.push(event.eventId); },
    });

    expect(result.mode).toBe('mock');
    expect(result.recordCount).toBe(eventIds.length);
    expect(eventIds.length).toBeGreaterThan(0);
    expect(rioHubTikTokMockProvider.payable).toBe(false);
  });

  it('does not advance a page cursor when processing fails', async () => {
    const database = openTestDatabase();
    const service = new ProviderSyncService(database);
    const provider: CursorSyncProvider<{ id: string }> = {
      code: 'mock-events', mode: 'mock', capabilities: ['cursor-sync'],
      async listSyncPage() { return { records: [{ id: 'event-1' }], nextCursor: 'page-2' }; },
    };

    await expect(service.sync(provider, {
      stream: 'orders', processRecord: () => { throw new Error('cannot process record'); },
    })).rejects.toThrow('cannot process record');
    expect(database.prepare('SELECT * FROM sync_cursors WHERE provider = ? AND stream = ?')
      .get('mock-events', 'orders')).toBeUndefined();
    expect(database.prepare('SELECT status, page_count, record_count FROM provider_sync_runs')
      .get()).toEqual({ status: 'failed', page_count: 0, record_count: 0 });
  });

  it('requires the cursor-sync capability without changing legacy provider contracts', async () => {
    const database = openTestDatabase();
    const service = new ProviderSyncService(database);
    const legacyShapedProvider = {
      code: 'legacy', mode: 'mock' as const, capabilities: [],
      async listSyncPage() { return { records: [], nextCursor: null }; },
    } as CursorSyncProvider;

    await expect(service.sync(legacyShapedProvider, { stream: 'orders' }))
      .rejects.toThrow(ProviderSyncError);
  });

  it('deduplicates webhook delivery and persists processing outcomes', () => {
    const database = openTestDatabase();
    const service = new ProviderSyncService(database);
    const first = service.recordWebhook({
      provider: 'mock-events', externalEventId: 'evt-001', payload: { order: 'A-1' }, signatureValid: true,
    });
    const duplicate = service.recordWebhook({
      provider: 'mock-events', externalEventId: 'evt-001', payload: { order: 'mutated' }, signatureValid: false,
    });

    expect(first.duplicate).toBe(false);
    expect(duplicate).toEqual({ event: first.event, duplicate: true });
    expect(service.markWebhookFailed(first.event.id, 'schema rejected')).toMatchObject({
      id: first.event.id, error: 'schema rejected', processedAt: expect.any(String),
    });
  });
});
