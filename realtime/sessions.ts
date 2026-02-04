import { type Client, createClient } from "@libsql/client";

import { DB_PATH } from "./config";
import type { SessionRow } from "./types";

const db: Client = createClient({ url: `file:${DB_PATH}` });

export async function getSession(
  sessionId: string,
): Promise<SessionRow | null> {
  const res = await db.execute({
    sql: "select id, username, expires_at from sessions where id = ?",
    args: [sessionId],
  });

  const row = res.rows[0] as unknown as SessionRow | undefined;
  if (!row) return null;

  if (new Date(row.expires_at).getTime() <= Date.now()) {
    await db.execute({
      sql: "delete from sessions where id = ?",
      args: [sessionId],
    });
    return null;
  }

  return row;
}
