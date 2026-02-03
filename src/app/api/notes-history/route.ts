export const runtime = "nodejs";

import crypto from "node:crypto";

import type { NextRequest } from "next/server";

import { authCookieName, decodeAndVerifySessionCookie } from "@/lib/auth";
import { verifyCsrfToken } from "@/lib/csrf";
import { getDb } from "@/lib/db";
import { consumeRateLimit } from "@/lib/rate-limit";
import { publishRealtimeEvent } from "@/lib/realtime-client";
import { getSession } from "@/lib/sessions";

type EventKind = "create" | "update" | "delete" | "undo" | "redo";

async function requireSession(request: NextRequest) {
  const rawCookie = request.cookies.get(authCookieName)?.value;
  const sessionId = decodeAndVerifySessionCookie(rawCookie);
  if (!sessionId) return null;
  return await getSession(sessionId);
}

export async function GET(request: NextRequest) {
  const session = await requireSession(request);
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
  const session = await requireSession(request);
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

  const body = (await request.json().catch(() => null)) as {
    kind?: unknown;
    note_id?: unknown;
    target_event_id?: unknown;
    payload_iv?: unknown;
    payload_ciphertext?: unknown;
  } | null;

  const kind = typeof body?.kind === "string" ? (body.kind as EventKind) : null;
  const noteId = typeof body?.note_id === "string" ? body.note_id : "";
  const targetEventId =
    typeof body?.target_event_id === "string" ? body.target_event_id : null;
  const payloadIv =
    typeof body?.payload_iv === "string" ? body.payload_iv : null;
  const payloadCiphertext =
    typeof body?.payload_ciphertext === "string"
      ? body.payload_ciphertext
      : null;

  const allowed: EventKind[] = ["create", "update", "delete", "undo", "redo"];
  if (!kind || !allowed.includes(kind)) {
    return Response.json({ ok: false, error: "invalid kind" }, { status: 400 });
  }

  if (!noteId) {
    return Response.json(
      { ok: false, error: "note_id required" },
      { status: 400 },
    );
  }

  if (kind === "undo" || kind === "redo") {
    if (!targetEventId) {
      return Response.json(
        { ok: false, error: "target_event_id required" },
        { status: 400 },
      );
    }
  }

  if (kind === "create" || kind === "update") {
    if (!payloadIv || !payloadCiphertext) {
      return Response.json(
        { ok: false, error: "payload required" },
        { status: 400 },
      );
    }
  }

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
