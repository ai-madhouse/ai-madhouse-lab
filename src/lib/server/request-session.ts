import type { NextRequest } from "next/server";

import { authCookieName, decodeAndVerifySessionCookie } from "@/lib/auth";
import { getSession } from "@/lib/sessions";

type SessionRecord = NonNullable<Awaited<ReturnType<typeof getSession>>>;

export function getSessionIdFromRequest(request: NextRequest) {
  const rawCookie = request.cookies.get(authCookieName)?.value;
  return decodeAndVerifySessionCookie(rawCookie);
}

export async function requireSessionFromRequest(request: NextRequest) {
  const sessionId = getSessionIdFromRequest(request);
  if (!sessionId) return null;
  return await getSession(sessionId);
}

export async function requireSessionWithIdFromRequest(
  request: NextRequest,
): Promise<{ sessionId: string; session: SessionRecord } | null> {
  const sessionId = getSessionIdFromRequest(request);
  if (!sessionId) return null;

  const session = await getSession(sessionId);
  if (!session) return null;

  return { sessionId, session };
}
