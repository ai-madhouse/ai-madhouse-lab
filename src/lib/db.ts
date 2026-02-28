import { mkdirSync } from "node:fs";
import path from "node:path";

import { type Client, createClient } from "@libsql/client";

const DEFAULT_DB_PATH = path.join(process.cwd(), "data", "app.db");

let clientSingleton: Client | null = null;

function isSqliteBusyError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return (
    message.includes("SQLITE_BUSY") || message.includes("database is locked")
  );
}

export async function withSqliteBusyRetry<T>(
  operation: () => Promise<T>,
  opts?: { retries?: number; delayMs?: number },
): Promise<T> {
  const retries = opts?.retries ?? 6;
  const delayMs = opts?.delayMs ?? 30;

  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isSqliteBusyError(error) || attempt >= retries) {
        throw error;
      }
      await new Promise((resolve) =>
        setTimeout(resolve, delayMs * (attempt + 1)),
      );
    }
  }
}

function ensureDirForFile(filePath: string) {
  mkdirSync(path.dirname(filePath), { recursive: true });
}

function resolveDbPath(rawPath: string | undefined) {
  const trimmed = rawPath?.trim();
  if (!trimmed) return DEFAULT_DB_PATH;
  return path.isAbsolute(trimmed) ? trimmed : path.resolve(trimmed);
}

async function migrate(client: Client) {
  await client.execute("PRAGMA journal_mode = WAL");
  await client.execute("PRAGMA busy_timeout = 5000");
  await client.execute("PRAGMA foreign_keys = ON");

  await client.execute(
    "CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)",
  );
  await client.execute(
    "INSERT INTO schema_version(version) SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM schema_version)",
  );

  await client.execute(
    "CREATE TABLE IF NOT EXISTS users (username TEXT PRIMARY KEY, password_hash TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')))",
  );

  await client.execute(
    "CREATE TABLE IF NOT EXISTS notes (id TEXT PRIMARY KEY, title TEXT NOT NULL, body TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now')))",
  );

  await client.execute(
    "CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, username TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), expires_at TEXT NOT NULL)",
  );

  // Backfill columns for newer builds.
  try {
    await client.execute("ALTER TABLE sessions ADD COLUMN ip TEXT");
  } catch {
    // ignore
  }

  try {
    await client.execute("ALTER TABLE sessions ADD COLUMN user_agent TEXT");
  } catch {
    // ignore
  }

  // If older builds stored ip/UA in plaintext, wipe them.
  try {
    await client.execute(
      "update sessions set ip = null, user_agent = null where ip is not null or user_agent is not null",
    );
  } catch {
    // ignore
  }

  await client.execute(
    "CREATE TABLE IF NOT EXISTS user_keys (username TEXT PRIMARY KEY, kdf_salt TEXT NOT NULL, wrapped_key_iv TEXT NOT NULL, wrapped_key_ciphertext TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')))",
  );

  await client.execute(
    "CREATE TABLE IF NOT EXISTS sessions_meta (session_id TEXT PRIMARY KEY, username TEXT NOT NULL, payload_iv TEXT NOT NULL, payload_ciphertext TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')))",
  );

  await client.execute(
    "CREATE INDEX IF NOT EXISTS sessions_meta_user_time ON sessions_meta(username, created_at)",
  );

  await client.execute(
    "CREATE TABLE IF NOT EXISTS realtime_connections (id TEXT PRIMARY KEY, username TEXT NOT NULL, connected_at TEXT NOT NULL DEFAULT (datetime('now')), last_seen_at TEXT NOT NULL DEFAULT (datetime('now')))",
  );

  await client.execute(
    "CREATE INDEX IF NOT EXISTS realtime_connections_user_seen ON realtime_connections(username, last_seen_at)",
  );

  await client.execute(
    "CREATE INDEX IF NOT EXISTS realtime_connections_seen ON realtime_connections(last_seen_at)",
  );

  await client.execute(
    "CREATE TABLE IF NOT EXISTS notes_events (id TEXT PRIMARY KEY, username TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), kind TEXT NOT NULL, note_id TEXT NOT NULL, target_event_id TEXT, payload_iv TEXT, payload_ciphertext TEXT)",
  );

  await client.execute(
    "CREATE INDEX IF NOT EXISTS notes_events_user_time ON notes_events(username, created_at)",
  );
}

export async function getDb(): Promise<Client> {
  if (clientSingleton) return clientSingleton;

  const dbPath = resolveDbPath(process.env.DB_PATH);
  ensureDirForFile(dbPath);

  const client = createClient({ url: `file:${dbPath}` });
  await migrate(client);

  clientSingleton = client;
  return client;
}

export async function dbHealthCheck(): Promise<{ ok: true; dbPath: string }> {
  const client = await getDb();
  const result = await client.execute("select 1 as ok");
  const ok = result.rows?.[0]?.ok;

  if (ok !== 1) {
    throw new Error("db health query failed");
  }

  const dbPath = resolveDbPath(process.env.DB_PATH);
  return { ok: true, dbPath };
}
