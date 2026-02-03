export const runtime = "nodejs";

import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";

import { authCookieName, decodeAndVerifySessionCookie } from "@/lib/auth";
import { verifyCsrfToken } from "@/lib/csrf";
import { getDb } from "@/lib/db";
import { consumeRateLimit } from "@/lib/rate-limit";
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
  return await getSession(sessionId);
}

export async function GET(request: NextRequest) {
  const session = await requireSession(request);
  if (!session) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  const res = await db.execute(
    "select id, title, body, created_at from notes order by created_at desc limit 50",
  );

  return Response.json({ ok: true, notes: res.rows as unknown as NoteRow[] });
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

  const ip = getClientIp(request.headers);
  const limiter = consumeRateLimit({
    key: `notes-write:${session.id}:${ip}`,
    limit: 60,
    windowSeconds: 60,
  });

  if (!limiter.ok) {
    return Response.json({ ok: false, error: "rate" }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as {
    id?: unknown;
    created_at?: unknown;
    title?: unknown;
    body?: unknown;
  } | null;

  const requestedId = typeof body?.id === "string" ? body.id.trim() : "";
  const requestedCreatedAt =
    typeof body?.created_at === "string" ? body.created_at.trim() : "";

  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const noteBody = typeof body?.body === "string" ? body.body : "";

  if (!title) {
    return Response.json(
      { ok: false, error: "title is required" },
      { status: 400 },
    );
  }

  const db = await getDb();

  const uuidLike = /^[0-9a-fA-F-]{36}$/;
  const id =
    requestedId && uuidLike.test(requestedId) ? requestedId : randomUUID();

  if (requestedId && id !== requestedId) {
    return Response.json({ ok: false, error: "invalid id" }, { status: 400 });
  }

  const createdAt =
    requestedCreatedAt && !Number.isNaN(Date.parse(requestedCreatedAt))
      ? requestedCreatedAt
      : "";

  try {
    if (createdAt) {
      await db.execute({
        sql: "insert into notes(id, title, body, created_at) values(?,?,?,?)",
        args: [id, title, noteBody, createdAt],
      });
    } else {
      await db.execute({
        sql: "insert into notes(id, title, body) values(?,?,?)",
        args: [id, title, noteBody],
      });
    }
  } catch {
    return Response.json({ ok: false, error: "conflict" }, { status: 409 });
  }

  const created = await db.execute({
    sql: "select id, title, body, created_at from notes where id = ?",
    args: [id],
  });

  return Response.json(
    { ok: true, note: created.rows[0] as unknown as NoteRow },
    { status: 201 },
  );
}
