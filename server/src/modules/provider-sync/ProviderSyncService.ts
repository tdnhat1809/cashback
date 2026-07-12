import type { SqliteDatabase } from '../../db/database.js';
import { createId, nowIso } from '../../lib/ids.js';
import {
  isCursorSyncProvider,
  type CursorSyncProvider,
  type ProviderCapabilities,
  type ProviderMode,
} from '../../providers/types.js';

interface SyncCursorRow {
  cursor: string | null;
}

interface WebhookEventRow {
  id: string;
  provider: string;
  external_event_id: string;
  payload_json: string;
  signature_valid: number;
  processed_at: string | null;
  error: string | null;
  created_at: string;
}

export interface ProviderSyncRunResult {
  id: string;
  provider: string;
  stream: string;
  mode: 'live' | 'mock';
  pageCount: number;
  recordCount: number;
  cursor: string | null;
}

export interface ProviderSyncOptions<TRecord> {
  stream: string;
  limit?: number;
  maxPages?: number;
  processRecord?: (record: TRecord) => Promise<void> | void;
}

export interface StoredWebhookEvent {
  id: string;
  provider: string;
  externalEventId: string;
  payload: unknown;
  signatureValid: boolean;
  processedAt: string | null;
  error: string | null;
  createdAt: string;
}

export class ProviderSyncError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
    this.name = 'ProviderSyncError';
  }
}

const MAX_IDENTIFIER_LENGTH = 100;
const MAX_PAGES = 1_000;

const assertIdentifier = (value: string, field: string): string => {
  const normalized = value.trim();
  if (!normalized || normalized.length > MAX_IDENTIFIER_LENGTH) {
    throw new ProviderSyncError(`${field} must contain 1-${MAX_IDENTIFIER_LENGTH} characters.`, 'invalid_sync_identifier');
  }
  return normalized;
};

const toRunMode = (mode: ProviderMode): 'live' | 'mock' => mode === 'mock' ? 'mock' : 'live';

const mapWebhook = (row: WebhookEventRow): StoredWebhookEvent => ({
  id: row.id,
  provider: row.provider,
  externalEventId: row.external_event_id,
  payload: JSON.parse(row.payload_json) as unknown,
  signatureValid: row.signature_valid === 1,
  processedAt: row.processed_at,
  error: row.error,
  createdAt: row.created_at,
});

/**
 * Persists generic cursor progress and webhook delivery state. It intentionally
 * has no provider-specific settlement or payout behavior; callers must opt in
 * with a capable provider and an explicit record handler.
 */
export class ProviderSyncService {
  constructor(private readonly database: SqliteDatabase) {}

  async sync<TRecord>(
    provider: CursorSyncProvider<TRecord> & ProviderCapabilities,
    options: ProviderSyncOptions<TRecord>,
  ): Promise<ProviderSyncRunResult> {
    if (!isCursorSyncProvider(provider)) {
      throw new ProviderSyncError('Provider does not support cursor synchronization.', 'provider_capability_missing');
    }
    const providerCode = assertIdentifier(provider.code, 'provider');
    const stream = assertIdentifier(options.stream, 'stream');
    const maxPages = Math.min(Math.max(options.maxPages ?? MAX_PAGES, 1), MAX_PAGES);
    const startedAt = nowIso();
    const runId = createId('sync');
    const mode = toRunMode(provider.mode);
    this.database.prepare(`
      INSERT INTO provider_sync_runs(id, provider, stream, mode, status, started_at)
      VALUES (?, ?, ?, ?, 'running', ?)
    `).run(runId, providerCode, stream, mode, startedAt);

    let cursor = (this.database.prepare(`
      SELECT cursor FROM sync_cursors WHERE provider = ? AND stream = ?
    `).get(providerCode, stream) as SyncCursorRow | undefined)?.cursor ?? null;
    let pageCount = 0;
    let recordCount = 0;

    try {
      do {
        if (pageCount >= maxPages) {
          throw new ProviderSyncError('Provider cursor pagination exceeded the configured page limit.', 'sync_page_limit_exceeded');
        }
        const page = await provider.listSyncPage(stream, { cursor, limit: options.limit });
        if (!Array.isArray(page.records) || (page.nextCursor !== null && typeof page.nextCursor !== 'string')) {
          throw new ProviderSyncError('Provider returned an invalid cursor sync page.', 'invalid_sync_page');
        }
        for (const record of page.records) await options.processRecord?.(record);
        pageCount += 1;
        recordCount += page.records.length;
        cursor = page.nextCursor;
        this.saveCursor(providerCode, stream, cursor);
      } while (cursor !== null);

      const finishedAt = nowIso();
      this.database.prepare(`
        UPDATE provider_sync_runs
        SET status = 'completed', page_count = ?, record_count = ?, finished_at = ?
        WHERE id = ?
      `).run(pageCount, recordCount, finishedAt, runId);
      return { id: runId, provider: providerCode, stream, mode, pageCount, recordCount, cursor };
    } catch (error) {
      this.database.prepare(`
        UPDATE provider_sync_runs SET status = 'failed', page_count = ?, record_count = ?, error = ?, finished_at = ?
        WHERE id = ?
      `).run(
        pageCount,
        recordCount,
        error instanceof Error ? error.message.slice(0, 1_000) : 'Unknown provider sync error',
        nowIso(),
        runId,
      );
      throw error;
    }
  }

  recordWebhook(input: {
    provider: string;
    externalEventId: string;
    payload: unknown;
    signatureValid: boolean;
  }): { event: StoredWebhookEvent; duplicate: boolean } {
    const provider = assertIdentifier(input.provider, 'provider');
    const externalEventId = assertIdentifier(input.externalEventId, 'externalEventId');
    return this.database.transaction(() => {
      const existing = this.database.prepare(`
        SELECT id, provider, external_event_id, payload_json, signature_valid, processed_at, error, created_at
        FROM webhook_events WHERE provider = ? AND external_event_id = ?
      `).get(provider, externalEventId) as WebhookEventRow | undefined;
      if (existing) return { event: mapWebhook(existing), duplicate: true };

      const id = createId('webhook');
      const timestamp = nowIso();
      this.database.prepare(`
        INSERT INTO webhook_events(
          id, provider, external_event_id, payload_json, signature_valid, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, provider, externalEventId, JSON.stringify(input.payload) ?? 'null', input.signatureValid ? 1 : 0, timestamp);
      const event = this.database.prepare(`
        SELECT id, provider, external_event_id, payload_json, signature_valid, processed_at, error, created_at
        FROM webhook_events WHERE id = ?
      `).get(id) as WebhookEventRow;
      return { event: mapWebhook(event), duplicate: false };
    })();
  }

  markWebhookProcessed(id: string): StoredWebhookEvent {
    return this.finishWebhook(id, null);
  }

  markWebhookFailed(id: string, error: string): StoredWebhookEvent {
    const normalized = error.trim();
    if (!normalized) throw new ProviderSyncError('Webhook error must not be empty.', 'invalid_webhook_error');
    return this.finishWebhook(id, normalized.slice(0, 1_000));
  }

  private saveCursor(provider: string, stream: string, cursor: string | null): void {
    const timestamp = nowIso();
    this.database.prepare(`
      INSERT INTO sync_cursors(provider, stream, cursor, last_synced_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(provider, stream) DO UPDATE SET
        cursor = excluded.cursor,
        last_synced_at = excluded.last_synced_at,
        updated_at = excluded.updated_at
    `).run(provider, stream, cursor, timestamp, timestamp);
  }

  private finishWebhook(id: string, error: string | null): StoredWebhookEvent {
    const timestamp = nowIso();
    const result = this.database.prepare(`
      UPDATE webhook_events SET processed_at = ?, error = ? WHERE id = ?
    `).run(timestamp, error, id);
    if (result.changes !== 1) throw new ProviderSyncError('Webhook event was not found.', 'webhook_event_not_found');
    const event = this.database.prepare(`
      SELECT id, provider, external_event_id, payload_json, signature_valid, processed_at, error, created_at
      FROM webhook_events WHERE id = ?
    `).get(id) as WebhookEventRow;
    return mapWebhook(event);
  }
}
