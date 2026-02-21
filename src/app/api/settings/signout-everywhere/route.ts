export const runtime = "nodejs";

import type { NextRequest } from "next/server";

import { clearAuthCookie, verifyCsrfToken } from "@/lib/auth";
import { requireSessionFromRequest } from "@/lib/server/request-session";
import { deleteSessionsForUser } from "@/lib/sessions";
import { notifySessionsChanged } from "@/lib/sessions-notify";

export async function POST(request: NextRequest) {
  const session = await requireSessionFromRequest(request);
  if (!session) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const token = request.headers.get("x-csrf-token") ?? "";
  if (!(await verifyCsrfToken(token))) {
    return Response.json({ ok: false, error: "csrf" }, { status: 403 });
  }

  await deleteSessionsForUser(session.username);
  await notifySessionsChanged({ username: session.username });
  await clearAuthCookie();

  return Response.json({ ok: true, redirectTo: "/login" });
}
