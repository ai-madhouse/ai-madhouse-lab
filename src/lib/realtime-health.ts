import { getDb } from "@/lib/db";

export type RealtimeHealth = {
  ok: true;
  connectionsTotal: number;
  usersConnected: number;
};

const REALTIME_STALE_SECONDS = 120;
const REALTIME_RUNTIME_URL = (
  process.env.REALTIME_URL || "http://127.0.0.1:8787"
)
  .trim()
  .replace(/\/$/, "");
const REALTIME_HEALTH_TIMEOUT_MS = 500;

function toRealtimeHealth(value: {
  connectionsTotal?: number | string | null;
  usersConnected?: number | string | null;
}): RealtimeHealth {
  return {
    ok: true,
    connectionsTotal: Number(value.connectionsTotal ?? 0),
    usersConnected: Number(value.usersConnected ?? 0),
  };
}

async function getRealtimeHealthFromRuntime(): Promise<RealtimeHealth | null> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    REALTIME_HEALTH_TIMEOUT_MS,
  );

  try {
    const res = await fetch(`${REALTIME_RUNTIME_URL}/health`, {
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json().catch(() => null)) as {
      ok: true;
      connectionsTotal?: number;
      usersConnected?: number;
    } | null;

    if (!json?.ok) return null;
    return toRealtimeHealth(json);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getRealtimeHealthFromDb(): Promise<RealtimeHealth> {
  const db = await getDb();
  const windowArg = `-${REALTIME_STALE_SECONDS} seconds`;

  const res = await db.execute({
    sql: "select count(*) as connectionsTotal, count(distinct username) as usersConnected from realtime_connections where last_seen_at >= datetime('now', ?)",
    args: [windowArg],
  });

  const row = res.rows[0] as
    | {
        connectionsTotal?: number | string | null;
        usersConnected?: number | string | null;
      }
    | undefined;

  return toRealtimeHealth(row ?? {});
}

export async function getRealtimeHealth(): Promise<RealtimeHealth | null> {
  const dbHealth = await getRealtimeHealthFromDb().catch(() => null);

  // Dashboard/runtime reads should use the same SQLite source-of-truth whenever
  // possible to avoid drift between bootstrap and WS-triggered refreshes.
  if (dbHealth) return dbHealth;

  const runtimeHealth = await getRealtimeHealthFromRuntime();
  if (runtimeHealth) return runtimeHealth;

  return null;
}
