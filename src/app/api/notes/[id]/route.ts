export const runtime = "nodejs";

import type { NextRequest } from "next/server";
import type { SessionRow } from "@/app/api/notes/types";
import { authCookieName, decodeAndVerifySessionCookie } from "@/lib/auth";
import { verifyCsrfToken } from "@/lib/csrf";
import { getDb } from "@/lib/db";
import { consumeRateLimit } from "@/lib/rate-limit";
import { publishRealtimeEvent } from "@/lib/realtime-client";
import { getClientIp } from "@/lib/request";
import { getSession } from "@/lib/sessions";

type NoteRow = {
  id: string;
  title: string;
  body: string;
  created_at: string;
};

async function requireSession(request: NextRequest) {
  const rawCookie = request.cookies.get(authCookieName)?.value;
  const sessionId = decodeAndVerifySessionCookie(rawCookie);
  if (!sessionId) return null;
  return (await getSession(sessionId)) as SessionRow & { id: string };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireSession(request);
  if (!session) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const db = await getDb();

  const res = await db.execute({
    sql: "select id, title, body, created_at from notes where id = ?",
    args: [id],
  });

  const row = res.rows[0];
  if (!row) {
    return Response.json({ ok: false, error: "not found" }, { status: 404 });
  }

  return Response.json({ ok: true, note: row as unknown as NoteRow });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireSession(request);
  if (!session) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const token = request.headers.get("x-csrf-token") ?? "";
  if (!(await verifyCsrfToken(token))) {
    return Response.json({ ok: false, error: "csrf" }, { status: 403 });
  }

  const ip = getClientIp(request.headers);
  const limiter = consumeRateLimit({
    key: `notes-write:${session.id}:${ip}`,
    limit: 120,
    windowSeconds: 60,
  });

  if (!limiter.ok) {
    return Response.json({ ok: false, error: "rate" }, { status: 429 });
  }

  const { id } = await params;

  const body = (await request.json().catch(() => null)) as {
    title?: unknown;
    body?: unknown;
  } | null;

  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const noteBody = typeof body?.body === "string" ? body.body : "";

  if (!title) {
    return Response.json(
      { ok: false, error: "title is required" },
      { status: 400 },
    );
  }

  const db = await getDb();
  await db.execute({
    sql: "update notes set title = ?, body = ? where id = ?",
    args: [title, noteBody, id],
  });

  const updated = await db.execute({
    sql: "select id, title, body, created_at from notes where id = ?",
    args: [id],
  });

  const row = updated.rows[0];
  if (!row) {
    return Response.json({ ok: false, error: "not found" }, { status: 404 });
  }

  const note = row as unknown as NoteRow;

  await publishRealtimeEvent({
    username: session.username,
    event: { type: "notes:changed", op: "update", note },
  });

  return Response.json({ ok: true, note });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireSession(request);
  if (!session) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const token = request.headers.get("x-csrf-token") ?? "";
  if (!(await verifyCsrfToken(token))) {
    return Response.json({ ok: false, error: "csrf" }, { status: 403 });
  }

  const ip = getClientIp(request.headers);
  const limiter = consumeRateLimit({
    key: `notes-write:${session.id}:${ip}`,
    limit: 120,
    windowSeconds: 60,
  });

  if (!limiter.ok) {
    return Response.json({ ok: false, error: "rate" }, { status: 429 });
  }

  const { id } = await params;
  const db = await getDb();
  const existing = await db.execute({
    sql: "select id, title, body, created_at from notes where id = ?",
    args: [id],
  });

  const row = existing.rows[0];
  if (!row) {
    return Response.json({ ok: false, error: "not found" }, { status: 404 });
  }

  await db.execute({ sql: "delete from notes where id = ?", args: [id] });

  const note = row as unknown as NoteRow;

  await publishRealtimeEvent({
    username: session.username,
    event: { type: "notes:changed", op: "delete", note },
  });

  return Response.json({ ok: true });
}
