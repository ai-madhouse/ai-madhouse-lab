"use client";

import { useEffect, useRef, useState } from "react";

import { E2EEDekUnlockCard } from "@/components/crypto/e2ee-dek-unlock-card";
import { NoteBodyEditor } from "@/components/notes/note-body-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { decryptJson, encryptJson } from "@/lib/crypto/webcrypto";
import {
  applyNotesEvents,
  type NoteSnapshot,
  type NotesEvent,
  type NotesEventKind,
} from "@/lib/notes-e2ee/model";
import { getRealtimeWsUrl } from "@/lib/realtime-url";

type NotesHistoryRow = {
  id: string;
  created_at: string;
  kind: NotesEventKind;
  note_id: string;
  target_event_id: string | null;
  payload_iv: string | null;
  payload_ciphertext: string | null;
};

function safeParseJson<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

// (moved into E2EEDekUnlockCard)

// (moved into E2EEDekUnlockCard)

// (moved into E2EEDekUnlockCard)

async function fetchHistory() {
  const res = await fetch("/api/notes-history", { cache: "no-store" });
  const json = (await res.json().catch(() => null)) as
    | { ok: true; events: NotesHistoryRow[] }
    | { ok: false; error?: string }
    | null;

  if (!res.ok) {
    throw new Error(
      (json && "error" in json && json.error) || "history failed",
    );
  }

  return (json && "events" in json && json.events) || [];
}

async function postHistoryEvent({
  csrfToken,
  kind,
  noteId,
  targetEventId,
  payload,
}: {
  csrfToken: string;
  kind: NotesEventKind;
  noteId: string;
  targetEventId?: string;
  payload?: { payload_iv: string; payload_ciphertext: string };
}) {
  const res = await fetch("/api/notes-history", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify({
      kind,
      note_id: noteId,
      target_event_id: targetEventId ?? null,
      payload_iv: payload?.payload_iv ?? null,
      payload_ciphertext: payload?.payload_ciphertext ?? null,
    }),
  });

  const json = (await res.json().catch(() => null)) as
    | { ok: true; id: string }
    | { ok: false; error?: string }
    | null;

  if (!res.ok) {
    throw new Error(
      (json && "error" in json && json.error) || "failed to write event",
    );
  }

  if (!json || !("id" in json) || !json.id) {
    throw new Error("missing event id");
  }

  return json.id;
}

// (replaced with proper UI in E2EEDekUnlockCard)

async function decryptHistory({
  key,
  history,
}: {
  key: CryptoKey;
  history: NotesHistoryRow[];
}) {
  const decrypted: NotesEvent[] = [];

  for (const row of history) {
    const ev: NotesEvent = {
      id: row.id,
      created_at: row.created_at,
      kind: row.kind,
      note_id: row.note_id,
      target_event_id: row.target_event_id,
      payload_iv: row.payload_iv,
      payload_ciphertext: row.payload_ciphertext,
    };

    if (
      (row.kind === "create" || row.kind === "update") &&
      row.payload_iv &&
      row.payload_ciphertext
    ) {
      try {
        ev.note = await decryptJson<NoteSnapshot>({
          key,
          payload_iv: row.payload_iv,
          payload_ciphertext: row.payload_ciphertext,
        });
      } catch {
        // ignore
      }
    }

    decrypted.push(ev);
  }

  const state = applyNotesEvents(decrypted);
  return { decrypted, state };
}

export function NotesE2EEDemo() {
  const [csrfToken, setCsrfToken] = useState<string>("");
  const [dekKey, setDekKey] = useState<CryptoKey | null>(null);

  const [notes, setNotes] = useState<NoteSnapshot[]>([]);
  const [events, setEvents] = useState<NotesEvent[]>([]);

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [undoTargetEventId, setUndoTargetEventId] = useState<string | null>(
    null,
  );
  const [redoTargetEventId, setRedoTargetEventId] = useState<string | null>(
    null,
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const undoRef = useRef<null | (() => void)>(null);
  const redoRef = useRef<null | (() => void)>(null);

  const refreshRef = useRef<null | (() => Promise<void>)>(null);

  useEffect(() => {
    refreshRef.current = async () => {
      if (!dekKey) return;

      setError(null);
      setLoading(true);
      try {
        const history = await fetchHistory();
        const { decrypted, state } = await decryptHistory({
          key: dekKey,
          history,
        });

        setEvents(decrypted);
        setNotes(state.notes);
        setCanUndo(state.canUndo);
        setCanRedo(state.canRedo);
        setUndoTargetEventId(state.undoTargetEventId);
        setRedoTargetEventId(state.redoTargetEventId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "failed to load history");
      } finally {
        setLoading(false);
      }
    };
  }, [dekKey]);

  async function handleUnlocked(result: {
    csrfToken: string;
    dekKey: CryptoKey;
  }) {
    setCsrfToken(result.csrfToken);
    setDekKey(result.dekKey);

    setError(null);
    setLoading(true);
    try {
      const history = await fetchHistory();
      const { decrypted, state } = await decryptHistory({
        key: result.dekKey,
        history,
      });

      setEvents(decrypted);
      setNotes(state.notes);
      setCanUndo(state.canUndo);
      setCanRedo(state.canRedo);
      setUndoTargetEventId(state.undoTargetEventId);
      setRedoTargetEventId(state.redoTargetEventId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed to init");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    undoRef.current = () => {
      void undo();
    };
    redoRef.current = () => {
      void redo();
    };
  });

  useEffect(() => {
    function isEditableElement(el: Element | null) {
      if (!el) return false;
      if (!(el instanceof HTMLElement)) return false;

      const tag = el.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return true;
      if (el.isContentEditable) return true;

      return false;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.altKey) return;
      if (!event.ctrlKey && !event.metaKey) return;

      if (isEditableElement(document.activeElement)) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        undoRef.current?.();
        return;
      }

      if (key === "y" || (key === "z" && event.shiftKey)) {
        event.preventDefault();
        redoRef.current?.();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    // Primary: same-origin SSE stream (works over SSH tunnels / no extra port).
    // Secondary: realtime websocket server (optional).

    const es = new EventSource("/api/notes-stream");

    es.addEventListener("notes:changed", () => {
      void refreshRef.current?.();
    });

    // Optional ws (if you expose/forward the realtime port).
    const url = getRealtimeWsUrl();
    const ws = url ? new WebSocket(url) : null;

    if (ws) {
      ws.onmessage = (event) => {
        const data = safeParseJson<{ type?: string }>(String(event.data));
        if (!data || data.type !== "notes:changed") return;
        void refreshRef.current?.();
      };
    }

    return () => {
      es.close();
      ws?.close();
    };
  }, []);

  async function createNote() {
    setError(null);
    if (!csrfToken) {
      setError("missing csrf token");
      return;
    }
    if (!dekKey) {
      setError("notes are locked");
      return;
    }

    const snapshot: NoteSnapshot = {
      id: crypto.randomUUID(),
      title: title.trim(),
      body,
      created_at: new Date().toISOString(),
    };

    if (!snapshot.title) return;

    try {
      const payload = await encryptJson({ key: dekKey, value: snapshot });
      await postHistoryEvent({
        csrfToken,
        kind: "create",
        noteId: snapshot.id,
        payload,
      });

      setTitle("");
      setBody("");
      await refreshRef.current?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed to create");
    }
  }

  async function saveNote(note: NoteSnapshot) {
    setError(null);
    if (!csrfToken) {
      setError("missing csrf token");
      return;
    }
    if (!dekKey) {
      setError("notes are locked");
      return;
    }

    try {
      const payload = await encryptJson({ key: dekKey, value: note });
      await postHistoryEvent({
        csrfToken,
        kind: "update",
        noteId: note.id,
        payload,
      });

      await refreshRef.current?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed to save");
    }
  }

  async function deleteNote(noteId: string) {
    setError(null);
    if (!csrfToken) {
      setError("missing csrf token");
      return;
    }

    try {
      await postHistoryEvent({ csrfToken, kind: "delete", noteId });
      await refreshRef.current?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed to delete");
    }
  }

  function findEventNoteId(eventId: string) {
    for (const e of events) {
      if (e.id === eventId) return e.note_id;
    }
    return null;
  }

  async function undo() {
    setError(null);
    if (!csrfToken) {
      setError("missing csrf token");
      return;
    }

    if (!undoTargetEventId) return;

    const noteId = findEventNoteId(undoTargetEventId);
    if (!noteId) {
      setError("missing undo target");
      return;
    }

    try {
      await postHistoryEvent({
        csrfToken,
        kind: "undo",
        noteId,
        targetEventId: undoTargetEventId,
      });
      await refreshRef.current?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "undo failed");
    }
  }

  async function redo() {
    setError(null);
    if (!csrfToken) {
      setError("missing csrf token");
      return;
    }

    if (!redoTargetEventId) return;

    const noteId = findEventNoteId(redoTargetEventId);
    if (!noteId) {
      setError("missing redo target");
      return;
    }

    try {
      await postHistoryEvent({
        csrfToken,
        kind: "redo",
        noteId,
        targetEventId: redoTargetEventId,
      });
      await refreshRef.current?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "redo failed");
    }
  }

  return (
    <div className="space-y-6">
      {!dekKey ? (
        <E2EEDekUnlockCard
          label="Unlock Notes"
          description="Notes are end-to-end encrypted. Set a passphrase once, then unlock on each device."
          onUnlocked={handleUnlocked}
        />
      ) : null}
      <div className="space-y-3 rounded-2xl border border-border/60 bg-card p-5">
        <div className="space-y-1">
          <p className="text-sm font-semibold">Create a note (E2EE)</p>
          <p className="text-sm text-muted-foreground">
            Notes are end-to-end encrypted and stored as an append-only event
            log.
          </p>
        </div>

        <div className="grid gap-3">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Title"
            disabled={!dekKey}
          />
          <NoteBodyEditor
            value={body}
            onChange={setBody}
            placeholder="Body (Markdown)"
            disabled={!dekKey}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={createNote} disabled={!title.trim() || !dekKey}>
              Create
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                void refreshRef.current?.();
              }}
              disabled={loading || !dekKey}
            >
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={undo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z / Cmd+Z)"
            >
              Undo
            </Button>
            <Button
              variant="outline"
              onClick={redo}
              disabled={!canRedo}
              title="Redo (Ctrl+Y or Ctrl+Shift+Z / Cmd+Shift+Z)"
            >
              Redo
            </Button>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Notes</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : null}
        </div>

        {notes.length === 0 && !loading ? (
          <p className="text-sm text-muted-foreground">No notes yet.</p>
        ) : null}

        <div className="grid gap-4">
          {notes.map((note) => (
            <div
              key={note.id}
              className="space-y-3 rounded-2xl border border-border/60 bg-card p-5"
            >
              <Input
                value={note.title}
                onChange={(event) =>
                  setNotes((prev) =>
                    prev.map((entry) =>
                      entry.id === note.id
                        ? { ...entry, title: event.target.value }
                        : entry,
                    ),
                  )
                }
              />
              <NoteBodyEditor
                value={note.body}
                onChange={(next) =>
                  setNotes((prev) =>
                    prev.map((entry) =>
                      entry.id === note.id ? { ...entry, body: next } : entry,
                    ),
                  )
                }
                onSave={() => {
                  void saveNote(note);
                }}
                placeholder="Body (Markdown)"
                disabled={!dekKey}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" onClick={() => deleteNote(note.id)}>
                  Delete
                </Button>
                <p className="text-xs text-muted-foreground">
                  {new Date(note.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
