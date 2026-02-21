export const runtime = "nodejs";

import type { NextRequest } from "next/server";

import { getUserDashboardMetrics } from "@/lib/dashboard-metrics";
import { requireSessionFromRequest } from "@/lib/server/request-session";

export async function GET(request: NextRequest) {
  const session = await requireSessionFromRequest(request);
  if (!session) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const metrics = await getUserDashboardMetrics(session.username);

  return Response.json(
    {
      ok: true,
      pulse: {
        ts: Date.now(),
        activeSessions: metrics.activeSessions,
        notesCount: metrics.notesCount,
        notesEventsLastHour: metrics.notesEventsLastHour,
        notesEventsLastDay: metrics.notesEventsLastDay,
        lastNotesActivityAt: metrics.lastNotesActivityAt,
        realtime: metrics.realtime,
      },
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
