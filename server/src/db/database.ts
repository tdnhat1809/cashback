import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';
import { migrations } from './schema.js';

export type SqliteDatabase = Database.Database;

export const openDatabase = (path: string): SqliteDatabase => {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const database = new Database(path);
  database.pragma('foreign_keys = ON');
  database.pragma('journal_mode = WAL');
  database.pragma('busy_timeout = 5000');
  migrateDatabase(database);
  return database;
};

export const migrateDatabase = (database: SqliteDatabase) => {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);
  const applied = new Set(
    database.prepare('SELECT version FROM schema_migrations').all().map((row) => (row as { version: number }).version),
  );
  const apply = database.transaction((version: number, name: string, sql: string) => {
    database.exec(sql);
    database.prepare('INSERT INTO schema_migrations(version, name, applied_at) VALUES (?, ?, ?)')
      .run(version, name, new Date().toISOString());
  });
  for (const migration of migrations) {
    if (!applied.has(migration.version)) apply(migration.version, migration.name, migration.sql);
  }
};
