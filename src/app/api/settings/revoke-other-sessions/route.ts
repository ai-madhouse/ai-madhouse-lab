export const runtime = "nodejs";

import type { NextRequest } from "next/server";

import { verifyCsrfToken } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/rate-limit";
import { requireSessionWithIdFromRequest } from "@/lib/server/request-session";
import { deleteOtherSessionsForUser } from "@/lib/sessions";
import { notifySessionsChanged } from "@/lib/sessions-notify";

export async function POST(request: NextRequest) {
  const auth = await requireSessionWithIdFromRequest(request);
  if (!auth) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const token = request.headers.get("x-csrf-token") ?? "";
  if (!(await verifyCsrfToken(token))) {
    return Response.json({ ok: false, error: "csrf" }, { status: 403 });
  }

  const limiter = consumeRateLimit({
    key: `revoke-other-sessions:${auth.session.username}`,
    limit: 10,
    windowSeconds: 60,
  });

  if (!limiter.ok) {
    return Response.json({ ok: false, error: "rate" }, { status: 429 });
  }

  await deleteOtherSessionsForUser({
    username: auth.session.username,
    keepSessionId: auth.sessionId,
  });
  await notifySessionsChanged({ username: auth.session.username });

  return Response.json({ ok: true });
}
