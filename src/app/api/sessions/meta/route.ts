export const runtime = "nodejs";

import type { NextRequest } from "next/server";

import {
  authCookieName,
  decodeAndVerifySessionCookie,
  verifyCsrfToken,
} from "@/lib/auth";
import { getDb } from "@/lib/db";
import { consumeRateLimit } from "@/lib/rate-limit";
import { getSession } from "@/lib/sessions";

async function requireSession(request: NextRequest) {
  const rawCookie = request.cookies.get(authCookieName)?.value;
  const sessionId = decodeAndVerifySessionCookie(rawCookie);
  if (!sessionId) return null;
  const session = await getSession(sessionId);
  return session ? { sessionId, session } : null;
}

export async function POST(request: NextRequest) {
  const res = await requireSession(request);
  if (!res) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const token = request.headers.get("x-csrf-token") ?? "";
  if (!(await verifyCsrfToken(token))) {
    return Response.json({ ok: false, error: "csrf" }, { status: 403 });
  }

  const limiter = consumeRateLimit({
    key: `sessions-meta:${res.session.username}`,
    limit: 60,
    windowSeconds: 60,
  });

  if (!limiter.ok) {
    return Response.json({ ok: false, error: "rate" }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as {
    session_id?: unknown;
    payload_iv?: unknown;
    payload_ciphertext?: unknown;
  } | null;

  const sessionId = typeof body?.session_id === "string" ? body.session_id : "";
  const payloadIv = typeof body?.payload_iv === "string" ? body.payload_iv : "";
  const payloadCiphertext =
    typeof body?.payload_ciphertext === "string" ? body.payload_ciphertext : "";

  if (!sessionId || !payloadIv || !payloadCiphertext) {
    return Response.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  // Only allow updating meta for this user's sessions.
  const db = await getDb();
  const owns = await db.execute({
    sql: "select 1 as ok from sessions where id = ? and username = ?",
    args: [sessionId, res.session.username],
  });

  if (owns.rows[0]?.ok !== 1) {
    return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  await db.execute({
    sql: "insert into sessions_meta(session_id, username, payload_iv, payload_ciphertext) values(?,?,?,?) on conflict(session_id) do update set payload_iv = excluded.payload_iv, payload_ciphertext = excluded.payload_ciphertext",
    args: [sessionId, res.session.username, payloadIv, payloadCiphertext],
  });

  return Response.json({ ok: true });
}
