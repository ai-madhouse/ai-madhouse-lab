export const runtime = "nodejs";

import type { NextRequest } from "next/server";

import { authCookieName, decodeAndVerifySessionCookie } from "@/lib/auth";
import { getClientIp } from "@/lib/request";
import { getSession } from "@/lib/sessions";

async function requireSession(request: NextRequest) {
  const rawCookie = request.cookies.get(authCookieName)?.value;
  const sessionId = decodeAndVerifySessionCookie(rawCookie);
  if (!sessionId) return null;
  const session = await getSession(sessionId);
  return session ? { sessionId, session } : null;
}

export async function GET(request: NextRequest) {
  const res = await requireSession(request);
  if (!res) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const ip = getClientIp(request.headers);

  return Response.json({
    ok: true,
    sessionId: res.sessionId,
    ip,
  });
}
