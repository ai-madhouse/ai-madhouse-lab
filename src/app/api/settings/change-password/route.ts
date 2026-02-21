export const runtime = "nodejs";

import type { NextRequest } from "next/server";

import { authenticate, verifyCsrfToken } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/rate-limit";
import { changePasswordFormSchema } from "@/lib/schemas/auth";
import { requireSessionWithIdFromRequest } from "@/lib/server/request-session";
import { deleteOtherSessionsForUser } from "@/lib/sessions";
import { notifySessionsChanged } from "@/lib/sessions-notify";
import { updateUserPassword } from "@/lib/users";

export async function POST(request: NextRequest) {
  const auth = await requireSessionWithIdFromRequest(request);
  if (!auth) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = changePasswordFormSchema.safeParse(body);

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message ?? "invalid";
    return Response.json({ ok: false, error: firstIssue }, { status: 400 });
  }

  const { csrfToken, currentPassword, newPassword } = parsed.data;

  if (!(await verifyCsrfToken(csrfToken))) {
    return Response.json({ ok: false, error: "csrf" }, { status: 403 });
  }

  const limiter = consumeRateLimit({
    key: `pw-change:${auth.session.username}`,
    limit: 10,
    windowSeconds: 60,
  });

  if (!limiter.ok) {
    return Response.json({ ok: false, error: "rate" }, { status: 429 });
  }

  if (!(await authenticate(auth.session.username, currentPassword))) {
    return Response.json(
      { ok: false, error: "bad_current_password" },
      { status: 400 },
    );
  }

  await updateUserPassword({ username: auth.session.username, newPassword });
  await deleteOtherSessionsForUser({
    username: auth.session.username,
    keepSessionId: auth.sessionId,
  });
  await notifySessionsChanged({ username: auth.session.username });

  return Response.json({ ok: true });
}
