export const runtime = "nodejs";

import { randomUUID } from "node:crypto";

import { getDb } from "@/lib/db";

type NoteRow = {
  id: string;
  title: string;
  body: string;
  created_at: string;
};

export async function GET() {
  const db = await getDb();
  const res = await db.execute(
    "select id, title, body, created_at from notes order by created_at desc limit 50",
  );

  return Response.json({ ok: true, notes: res.rows as unknown as NoteRow[] });
}

export async function POST(request: Request) {
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
  const id = randomUUID();

  await db.execute({
    sql: "insert into notes(id, title, body) values(?,?,?)",
    args: [id, title, noteBody],
  });

  const created = await db.execute({
    sql: "select id, title, body, created_at from notes where id = ?",
    args: [id],
  });

  return Response.json(
    { ok: true, note: created.rows[0] as unknown as NoteRow },
    { status: 201 },
  );
}
