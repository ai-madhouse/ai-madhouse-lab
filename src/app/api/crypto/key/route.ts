export const runtime = "nodejs";

import type { NextRequest } from "next/server";

import { verifyCsrfToken } from "@/lib/csrf";
import { getDb } from "@/lib/db";
import { consumeRateLimit } from "@/lib/rate-limit";
import { requireSessionFromRequest } from "@/lib/server/request-session";

export async function GET(request: NextRequest) {
  const session = await requireSessionFromRequest(request);
  if (!session) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  const res = await db.execute({
    sql: "select username, kdf_salt, wrapped_key_iv, wrapped_key_ciphertext, created_at from user_keys where username = ?",
    args: [session.username],
  });

  const row = res.rows[0] as unknown as
    | {
        username: string;
        kdf_salt: string;
        wrapped_key_iv: string;
        wrapped_key_ciphertext: string;
        created_at: string;
      }
    | undefined;

  if (!row) {
    return Response.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  return Response.json({ ok: true, key: row });
}

export async function POST(request: NextRequest) {
  const session = await requireSessionFromRequest(request);
  if (!session) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const token = request.headers.get("x-csrf-token") ?? "";
  if (!(await verifyCsrfToken(token))) {
    return Response.json({ ok: false, error: "csrf" }, { status: 403 });
  }

  const limiter = consumeRateLimit({
    key: `crypto-key:${session.username}`,
    limit: 30,
    windowSeconds: 60,
  });

  if (!limiter.ok) {
    return Response.json({ ok: false, error: "rate" }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as {
    kdf_salt?: unknown;
    wrapped_key_iv?: unknown;
    wrapped_key_ciphertext?: unknown;
  } | null;

  const kdfSalt = typeof body?.kdf_salt === "string" ? body.kdf_salt : "";
  const wrappedIv =
    typeof body?.wrapped_key_iv === "string" ? body.wrapped_key_iv : "";
  const wrappedCiphertext =
    typeof body?.wrapped_key_ciphertext === "string"
      ? body.wrapped_key_ciphertext
      : "";

  if (!kdfSalt || !wrappedIv || !wrappedCiphertext) {
    return Response.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  const db = await getDb();

  const existing = await db.execute({
    sql: "select 1 as ok from user_keys where username = ?",
    args: [session.username],
  });

  if (existing.rows[0]?.ok === 1) {
    return Response.json(
      { ok: false, error: "already_exists" },
      { status: 409 },
    );
  }

  await db.execute({
    sql: "insert into user_keys(username, kdf_salt, wrapped_key_iv, wrapped_key_ciphertext) values(?,?,?,?)",
    args: [session.username, kdfSalt, wrappedIv, wrappedCiphertext],
  });

  return Response.json({ ok: true });
}
