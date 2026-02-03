import { getDb } from "@/lib/db";

type NotesEventRow = {
  id: string;
  created_at: string;
  kind: "create" | "update" | "delete" | "undo" | "redo";
  note_id: string;
  target_event_id: string | null;
};

function applyNotesEventsForStats(events: NotesEventRow[]) {
  // Same undo/redo logic as client, but without decrypting note payloads.
  const undone = new Set<string>();
  const undoneStack: string[] = [];

  for (const e of events) {
    if (e.kind === "undo") {
      if (!e.target_event_id) continue;
      undone.add(e.target_event_id);
      undoneStack.push(e.target_event_id);
    }

    if (e.kind === "redo") {
      if (!e.target_event_id) continue;
      undone.delete(e.target_event_id);

      const idx = undoneStack.lastIndexOf(e.target_event_id);
      if (idx !== -1) undoneStack.splice(idx, 1);
    }
  }

  const notesById = new Set<string>();
  const appliedActionIds: string[] = [];

  for (const e of events) {
    if (e.kind === "undo" || e.kind === "redo") continue;
    if (undone.has(e.id)) continue;

    if (e.kind === "delete") {
      notesById.delete(e.note_id);
      appliedActionIds.push(e.id);
      continue;
    }

    if (e.kind === "create" || e.kind === "update") {
      notesById.add(e.note_id);
      appliedActionIds.push(e.id);
    }
  }

  return {
    notesCount: notesById.size,
    actionsCount: appliedActionIds.length,
  };
}

async function fetchRealtimeHealth() {
  const port = Number(process.env.REALTIME_PORT || "8787");
  const url = `http://127.0.0.1:${port}/health`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 300);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
    });

    if (!res.ok) return null;
    const json = (await res.json().catch(() => null)) as {
      ok: true;
      connectionsTotal?: number;
      usersConnected?: number;
    } | null;

    return json?.ok ? json : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getUserDashboardMetrics(username: string) {
  const db = await getDb();

  const sessionsRes = await db.execute({
    sql: "select count(*) as count from sessions where username = ? and expires_at > datetime('now')",
    args: [username],
  });

  const activeSessions = Number(
    (sessionsRes.rows[0] as unknown as { count?: number })?.count ?? 0,
  );

  const notesRes = await db.execute({
    sql: "select id, created_at, kind, note_id, target_event_id from notes_events where username = ? order by created_at asc",
    args: [username],
  });

  const events = notesRes.rows as unknown as NotesEventRow[];
  const stats = applyNotesEventsForStats(events);

  const now = Date.now();
  const oneHourAgo = new Date(now - 60 * 60 * 1000).toISOString();
  const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();

  const eventsHourRes = await db.execute({
    sql: "select count(*) as count from notes_events where username = ? and created_at >= ?",
    args: [username, oneHourAgo],
  });

  const eventsDayRes = await db.execute({
    sql: "select count(*) as count from notes_events where username = ? and created_at >= ?",
    args: [username, oneDayAgo],
  });

  const notesEventsLastHour = Number(
    (eventsHourRes.rows[0] as unknown as { count?: number })?.count ?? 0,
  );
  const notesEventsLastDay = Number(
    (eventsDayRes.rows[0] as unknown as { count?: number })?.count ?? 0,
  );

  const latestRes = await db.execute({
    sql: "select created_at from notes_events where username = ? order by created_at desc, id desc limit 1",
    args: [username],
  });

  const lastNotesActivityAt =
    (latestRes.rows[0] as unknown as { created_at?: string })?.created_at ??
    null;

  const realtime = await fetchRealtimeHealth();

  return {
    activeSessions,
    notesCount: stats.notesCount,
    notesEventsLastHour,
    notesEventsLastDay,
    lastNotesActivityAt,
    realtime,
  };
}
