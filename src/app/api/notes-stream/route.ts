export const runtime = "nodejs";

import type { NextRequest } from "next/server";

import { getDb } from "@/lib/db";
import { buildNotesStreamTickResult } from "@/lib/notes-stream-events";
import { requireSessionFromRequest } from "@/lib/server/request-session";

async function getLatestEventId(username: string) {
  const db = await getDb();
  const res = await db.execute({
    sql: "select id from notes_events where username = ? order by created_at desc, id desc limit 1",
    args: [username],
  });

  const row = res.rows[0] as unknown as { id?: string } | undefined;
  return row?.id ?? null;
}

export async function GET(request: NextRequest) {
  const session = await requireSessionFromRequest(request);
  if (!session) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { signal } = request;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();

      function send(event: string, data: unknown) {
        controller.enqueue(encoder.encode(`event: ${event}\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      // Initial ping + initial state marker.
      let lastId: string | null = null;
      try {
        lastId = await getLatestEventId(session.username);
      } catch {
        // ignore
      }

      send("hello", { ok: true });
      send("notes:changed", { id: lastId });

      const intervalMs = 1500;

      const intervalId = setInterval(async () => {
        try {
          const latest = await getLatestEventId(session.username);
          const tick = buildNotesStreamTickResult({
            lastId,
            latestId: latest,
          });
          lastId = tick.nextLastId;
          // Emits either notes:changed or ping keep-alive.
          send(tick.payload.event, tick.payload.data);
        } catch {
          // ignore
        }
      }, intervalMs);

      signal.addEventListener(
        "abort",
        () => {
          clearInterval(intervalId);
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
