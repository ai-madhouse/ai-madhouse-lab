import crypto from "node:crypto";

import { getDb } from "@/lib/db";

function randomId() {
  return crypto.randomBytes(24).toString("base64url");
}

export async function createSession({
  username,
  ttlSeconds = 60 * 60 * 24 * 7,
  ip,
  userAgent,
}: {
  username: string;
  ttlSeconds?: number;
  ip?: string;
  userAgent?: string;
}) {
  const db = await getDb();
  const id = randomId();
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

  await db.execute({
    sql: "insert into sessions(id, username, expires_at, ip, user_agent) values(?,?,?,?,?)",
    args: [id, username, expiresAt, ip ?? null, userAgent ?? null],
  });

  return { id, username, expiresAt };
}

export async function getSession(sessionId: string) {
  const db = await getDb();
  const res = await db.execute({
    sql: "select id, username, expires_at, ip, user_agent from sessions where id = ?",
    args: [sessionId],
  });

  const row = res.rows[0] as unknown as
    | {
        id: string;
        username: string;
        expires_at: string;
        ip?: string | null;
        user_agent?: string | null;
      }
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

export async function listSessionsForUser(username: string) {
  const db = await getDb();
  const res = await db.execute({
    sql: "select id, username, created_at, expires_at, ip, user_agent from sessions where username = ? order by created_at desc",
    args: [username],
  });

  return res.rows as unknown as Array<{
    id: string;
    username: string;
    created_at: string;
    expires_at: string;
    ip?: string | null;
    user_agent?: string | null;
  }>;
}

export async function deleteSessionsForUser(username: string) {
  const db = await getDb();
  await db.execute({
    sql: "delete from sessions where username = ?",
    args: [username],
  });
}

export async function deleteOtherSessionsForUser({
  username,
  keepSessionId,
}: {
  username: string;
  keepSessionId: string;
}) {
  const db = await getDb();
  await db.execute({
    sql: "delete from sessions where username = ? and id <> ?",
    args: [username, keepSessionId],
  });
}
