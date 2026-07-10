import type { CursorSyncRequest } from '../types.js';

export class OfflineFixtureAdapterError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
    this.name = 'OfflineFixtureAdapterError';
  }
}

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 1_000;

const normalizeLimit = (value: number | undefined): number => {
  const limit = value ?? DEFAULT_LIMIT;
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw new OfflineFixtureAdapterError(
      `Fixture page limit must be an integer between 1 and ${MAX_LIMIT}.`,
      'invalid_fixture_page_limit',
    );
  }
  return limit;
};

const encodeCursor = (namespace: string, offset: number): string =>
  Buffer.from(`offline-fixture:${namespace}:${offset}`, 'utf8').toString('base64url');

const decodeCursor = (namespace: string, cursor: string | null | undefined): number => {
  if (cursor == null) return 0;
  let decoded: string;
  try {
    decoded = Buffer.from(cursor, 'base64url').toString('utf8');
  } catch {
    throw new OfflineFixtureAdapterError('Fixture pagination cursor is invalid.', 'invalid_fixture_cursor');
  }
  const prefix = `offline-fixture:${namespace}:`;
  const offset = decoded.startsWith(prefix) ? decoded.slice(prefix.length) : '';
  if (!/^\d+$/.test(offset)) {
    throw new OfflineFixtureAdapterError('Fixture pagination cursor is invalid.', 'invalid_fixture_cursor');
  }
  return Number(offset);
};

/**
 * Local-only pagination for deterministic fixtures. It performs no I/O and does
 * not emulate, imply, or authorize a provider's production pagination API.
 */
export const paginateOfflineFixture = <T>(
  namespace: string,
  records: readonly T[],
  input: CursorSyncRequest,
): { records: readonly T[]; nextCursor: string | null } => {
  const offset = decodeCursor(namespace, input.cursor);
  if (offset > records.length) {
    throw new OfflineFixtureAdapterError('Fixture pagination cursor is invalid.', 'invalid_fixture_cursor');
  }
  const pageRecords = records.slice(offset, offset + normalizeLimit(input.limit));
  const nextOffset = offset + pageRecords.length;
  return {
    records: pageRecords,
    nextCursor: nextOffset < records.length ? encodeCursor(namespace, nextOffset) : null,
  };
};
