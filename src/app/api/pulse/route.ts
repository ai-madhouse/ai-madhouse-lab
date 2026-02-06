export const runtime = "nodejs";

import type { NextRequest } from "next/server";

import { getUserDashboardMetrics } from "@/lib/dashboard-metrics";
import { requireSessionFromRequest } from "@/lib/server/request-session";

export async function GET(request: NextRequest) {
  const session = await requireSessionFromRequest(request);
  if (!session) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { signal } = request;
  const username = session.username;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();

      function send(event: string, data: unknown) {
        controller.enqueue(encoder.encode(`event: ${event}\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      async function sendPulse() {
        try {
          const metrics = await getUserDashboardMetrics(username);
          send("pulse", {
            ts: Date.now(),
            activeSessions: metrics.activeSessions,
            notesCount: metrics.notesCount,
            notesEventsLastHour: metrics.notesEventsLastHour,
            notesEventsLastDay: metrics.notesEventsLastDay,
            lastNotesActivityAt: metrics.lastNotesActivityAt,
            realtime: metrics.realtime,
          });
        } catch (err) {
          send("pulse", {
            ts: Date.now(),
            error: err instanceof Error ? err.message : "pulse failed",
          });
        }
      }

      // Initial payload
      await sendPulse();

      const id = setInterval(() => {
        void sendPulse();
      }, 2000);

      signal.addEventListener(
        "abort",
        () => {
          clearInterval(id);
          controller.close();
        },
        { once: true },
      );
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
