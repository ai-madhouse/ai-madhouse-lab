import crypto from "node:crypto";

import { getDb } from "@/lib/db";

function randomId() {
  return crypto.randomBytes(24).toString("base64url");
}

export async function createSession({
  username,
  ttlSeconds = 60 * 60 * 24 * 7,
}: {
  username: string;
  ttlSeconds?: number;
}) {
  const db = await getDb();
  const id = randomId();
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

  await db.execute({
    sql: "insert into sessions(id, username, expires_at) values(?,?,?)",
    args: [id, username, expiresAt],
  });

  return { id, username, expiresAt };
}

export async function getSession(sessionId: string) {
  const db = await getDb();
  const res = await db.execute({
    sql: "select id, username, expires_at from sessions where id = ?",
    args: [sessionId],
  });

  const row = res.rows[0] as unknown as
    | { id: string; username: string; expires_at: string }
    | undefined;
  if (!row) return null;

  if (new Date(row.expires_at).getTime() <= Date.now()) {
    await deleteSession(sessionId);
    return null;
  }

  return row;
}

export async function deleteSession(sessionId: string) {
  const db = await getDb();
  await db.execute({
    sql: "delete from sessions where id = ?",
    args: [sessionId],
  });
}
