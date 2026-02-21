export const runtime = "nodejs";

import type { NextRequest } from "next/server";

import { getRealtimeHealth } from "@/lib/realtime-health";
import { requireSessionFromRequest } from "@/lib/server/request-session";

export async function GET(request: NextRequest) {
  const session = await requireSessionFromRequest(request);
  if (!session) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const realtime = await getRealtimeHealth();
  if (!realtime) {
    return Response.json(
      { ok: false, error: "realtime unavailable" },
      { status: 503 },
    );
  }

  return Response.json(realtime, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
