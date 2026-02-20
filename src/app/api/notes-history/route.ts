export const runtime = "nodejs";

import crypto from "node:crypto";

import type { NextRequest } from "next/server";

import { verifyCsrfToken } from "@/lib/csrf";
import { getDb } from "@/lib/db";
import { consumeRateLimit } from "@/lib/rate-limit";
import { publishRealtimeEvent } from "@/lib/realtime-client";
import { notesHistoryPostRequestSchema } from "@/lib/schemas/internal-api";
import { requireSessionFromRequest } from "@/lib/server/request-session";

export async function GET(request: NextRequest) {
  const session = await requireSessionFromRequest(request);
  if (!session) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  const res = await db.execute({
    sql: "select id, username, created_at, kind, note_id, target_event_id, payload_iv, payload_ciphertext from notes_events where username = ? order by created_at asc",
    args: [session.username],
  });

  return Response.json({ ok: true, events: res.rows });
}

export async function POST(request: NextRequest) {
  const session = await requireSessionFromRequest(request);
  if (!session) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const token = request.headers.get("x-csrf-token") ?? "";
  if (!(await verifyCsrfToken(token))) {
    return Response.json({ ok: false, error: "csrf" }, { status: 403 });
  }

  const limiter = consumeRateLimit({
    key: `notes-history-write:${session.username}`,
    limit: 240,
    windowSeconds: 60,
  });

  if (!limiter.ok) {
    return Response.json({ ok: false, error: "rate" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return Response.json({ ok: false, error: "invalid kind" }, { status: 400 });
  }

  const parsed = notesHistoryPostRequestSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const message =
      issue?.code === "invalid_value" && issue.path[0] === "kind"
        ? "invalid kind"
        : issue?.message || "invalid kind";
    return Response.json({ ok: false, error: message }, { status: 400 });
  }
  const kind = parsed.data.kind;
  const noteId = parsed.data.note_id ?? "";
  const targetEventId = parsed.data.target_event_id ?? null;
  const payloadIv = parsed.data.payload_iv ?? null;
  const payloadCiphertext = parsed.data.payload_ciphertext ?? null;

  const id = crypto.randomUUID();

  const db = await getDb();
  await db.execute({
    sql: "insert into notes_events(id, username, kind, note_id, target_event_id, payload_iv, payload_ciphertext) values(?,?,?,?,?,?,?)",
    args: [
      id,
      session.username,
      kind,
      noteId,
      targetEventId,
      payloadIv,
      payloadCiphertext,
    ],
  });

  await publishRealtimeEvent({
    username: session.username,
    event: { type: "notes:changed" },
  });

  return Response.json({ ok: true, id });
}
