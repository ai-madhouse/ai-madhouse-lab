export const runtime = "nodejs";

import type { NextRequest } from "next/server";

import { getClientIp } from "@/lib/request";
import { requireSessionWithIdFromRequest } from "@/lib/server/request-session";

export async function GET(request: NextRequest) {
  const res = await requireSessionWithIdFromRequest(request);
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
