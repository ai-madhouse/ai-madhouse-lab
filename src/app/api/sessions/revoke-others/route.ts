export const runtime = "nodejs";

import type { NextRequest } from "next/server";

import { verifyCsrfToken } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/rate-limit";
import { requireSessionWithIdFromRequest } from "@/lib/server/request-session";
import { deleteOtherSessionsForUser } from "@/lib/sessions";
import { notifySessionsChanged } from "@/lib/sessions-notify";

export async function POST(request: NextRequest) {
  const res = await requireSessionWithIdFromRequest(request);
  if (!res) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const csrfToken = request.headers.get("x-csrf-token") ?? "";
  if (!(await verifyCsrfToken(csrfToken))) {
    return Response.json({ ok: false, error: "csrf" }, { status: 403 });
  }

  const limiter = consumeRateLimit({
    key: `revoke-other-sessions:${res.session.username}`,
    limit: 10,
    windowSeconds: 60,
  });

  if (!limiter.ok) {
    return Response.json({ ok: false, error: "rate" }, { status: 429 });
  }

  await deleteOtherSessionsForUser({
    username: res.session.username,
    keepSessionId: res.sessionId,
  });
  await notifySessionsChanged({ username: res.session.username });

  return Response.json({ ok: true });
}
