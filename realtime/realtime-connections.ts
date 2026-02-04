import type { Client } from "@libsql/client";

function secondsAgoModifier(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  return `-${s} seconds`;
}

export async function ensureRealtimeConnectionsTable(db: Client) {
  await db.execute(
    "CREATE TABLE IF NOT EXISTS realtime_connections (id TEXT PRIMARY KEY, username TEXT NOT NULL, connected_at TEXT NOT NULL DEFAULT (datetime('now')), last_seen_at TEXT NOT NULL DEFAULT (datetime('now')))",
  );

  await db.execute(
    "CREATE INDEX IF NOT EXISTS realtime_connections_user_seen ON realtime_connections(username, last_seen_at)",
  );

  await db.execute(
    "CREATE INDEX IF NOT EXISTS realtime_connections_seen ON realtime_connections(last_seen_at)",
  );
}

export async function registerRealtimeConnection(
  db: Client,
  { id, username }: { id: string; username: string },
) {
  await db.execute({
    sql: "insert into realtime_connections(id, username) values(?, ?) on conflict(id) do update set username = excluded.username, last_seen_at = datetime('now')",
    args: [id, username],
  });
}

export async function unregisterRealtimeConnection(db: Client, id: string) {
  await db.execute({
    sql: "delete from realtime_connections where id = ?",
    args: [id],
  });
}

export async function touchRealtimeConnection(db: Client, id: string) {
  await db.execute({
    sql: "update realtime_connections set last_seen_at = datetime('now') where id = ?",
    args: [id],
  });
}

export async function pruneRealtimeConnections(
  db: Client,
  staleSeconds: number,
) {
  await db.execute({
    sql: "delete from realtime_connections where last_seen_at < datetime('now', ?)",
    args: [secondsAgoModifier(staleSeconds)],
  });
}

export async function countRealtimeConnections(
  db: Client,
  staleSeconds: number,
) {
  const res = await db.execute({
    sql: "select count(*) as connectionsTotal, count(distinct username) as usersConnected from realtime_connections where last_seen_at >= datetime('now', ?)",
    args: [secondsAgoModifier(staleSeconds)],
  });

  const row = res.rows[0] as unknown as
    | {
        connectionsTotal?: number | string | null;
        usersConnected?: number | string | null;
      }
    | undefined;

  return {
    connectionsTotal: Number(row?.connectionsTotal ?? 0),
    usersConnected: Number(row?.usersConnected ?? 0),
  };
}
