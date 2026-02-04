export const runtime = "nodejs";

import type { NextRequest } from "next/server";

import {
  authCookieName,
  decodeAndVerifySessionCookie,
  verifyCsrfToken,
} from "@/lib/auth";
import { getDb } from "@/lib/db";
import { revokeSessionAndNotify } from "@/lib/sessions-notify";

export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const cookie = request.cookies.get(authCookieName)?.value;
  const currentSessionId = decodeAndVerifySessionCookie(cookie);
  if (!currentSessionId) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const token = request.headers.get("x-csrf-token") ?? "";
  if (!(await verifyCsrfToken(token))) {
    return Response.json({ ok: false, error: "csrf" }, { status: 403 });
  }

  const { id } = await ctx.params;
  if (!id) {
    return Response.json({ ok: false, error: "missing id" }, { status: 400 });
  }

  if (id === currentSessionId) {
    return Response.json(
      { ok: false, error: "cannot delete current session" },
      { status: 400 },
    );
  }

  // Ensure the target session belongs to the same user as the current session.
  const db = await getDb();
  const owner = await db.execute({
    sql: "select username from sessions where id = ?",
    args: [currentSessionId],
  });
  const username = (owner.rows[0] as unknown as { username?: string })
    ?.username;

  if (!username) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const target = await db.execute({
    sql: "select id from sessions where id = ? and username = ?",
    args: [id, username],
  });

  if (!target.rows[0]) {
    return Response.json({ ok: false, error: "not found" }, { status: 404 });
  }

  await revokeSessionAndNotify({ username, sessionId: id });
  return Response.json({ ok: true });
}
