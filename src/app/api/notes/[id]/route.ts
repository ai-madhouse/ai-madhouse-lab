export const runtime = "nodejs";

import { getDb } from "@/lib/db";

type NoteRow = {
  id: string;
  title: string;
  body: string;
  created_at: string;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

  return Response.json({ ok: true, note: row as unknown as NoteRow });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const db = await getDb();
  await db.execute({ sql: "delete from notes where id = ?", args: [id] });

  return Response.json({ ok: true });
}
