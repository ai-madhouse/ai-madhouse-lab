import { getDb } from "@/lib/db";

export type RealtimeHealth = {
  ok: true;
  connectionsTotal: number;
  usersConnected: number;
};

const REALTIME_STALE_SECONDS = 120;

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

  return {
    ok: true,
    connectionsTotal: Number(row?.connectionsTotal ?? 0),
    usersConnected: Number(row?.usersConnected ?? 0),
  };
}
