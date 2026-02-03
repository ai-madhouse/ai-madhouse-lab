import { mkdirSync } from "node:fs";
import path from "node:path";

import { type Client, createClient } from "@libsql/client";

const DEFAULT_DB_PATH = path.join(process.cwd(), "data", "app.db");

let clientSingleton: Client | null = null;

function ensureDirForFile(filePath: string) {
  mkdirSync(path.dirname(filePath), { recursive: true });
}

async function migrate(client: Client) {
  await client.execute("PRAGMA foreign_keys = ON");

  await client.execute(
    "CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)",
  );
  await client.execute(
    "INSERT INTO schema_version(version) SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM schema_version)",
  );

  await client.execute(
    "CREATE TABLE IF NOT EXISTS notes (id TEXT PRIMARY KEY, title TEXT NOT NULL, body TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now')))",
  );

  await client.execute(
    "CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, username TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), expires_at TEXT NOT NULL)",
  );
}

export async function getDb(): Promise<Client> {
  if (clientSingleton) return clientSingleton;

  const dbPath = process.env.DB_PATH?.trim() || DEFAULT_DB_PATH;
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

  const dbPath = process.env.DB_PATH?.trim() || DEFAULT_DB_PATH;
  return { ok: true, dbPath };
}
