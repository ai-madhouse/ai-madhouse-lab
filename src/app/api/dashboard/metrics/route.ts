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
      metrics,
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
