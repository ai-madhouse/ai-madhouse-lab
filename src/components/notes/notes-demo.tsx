"use client";

import { useEffect, useRef, useState } from "react";
import { NoteBodyEditor } from "@/components/notes/note-body-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  type NoteSnapshot,
  type NotesAction,
  popLast,
  pushUndo,
} from "@/lib/notes-history";
import { getRealtimeWsUrl } from "@/lib/realtime-url";

type Note = NoteSnapshot;

type NotesApiList = { ok: boolean; notes?: Note[]; error?: string };

type NotesApiSingle = { ok: boolean; note?: Note; error?: string };

function safeParseJson<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function buildLastSaved(next: Note[]): Record<string, Note> {
  const map: Record<string, Note> = {};
  for (const n of next) map[n.id] = n;
  return map;
}

async function fetchNotes() {
  const res = await fetch("/api/notes", { cache: "no-store" });
  const json = (await res.json().catch(() => null)) as NotesApiList | null;
  if (!res.ok) {
    throw new Error(json?.error ?? "failed to load notes");
  }
  return json?.notes ?? [];
}

async function fetchCsrfToken() {
  const res = await fetch("/api/csrf", { cache: "no-store" });
  const json = (await res.json().catch(() => null)) as
    | { ok: true; token: string }
    | { ok: false; error?: string }
    | null;

  if (res.ok && json && "ok" in json && json.ok) return json.token;
  throw new Error((json && "error" in json && json.error) || "csrf failed");
}

export function NotesDemo() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [csrfToken, setCsrfToken] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const [lastSaved, setLastSaved] = useState<Record<string, Note>>({});
  const [undoStack, setUndoStack] = useState<NotesAction[]>([]);
  const [redoStack, setRedoStack] = useState<NotesAction[]>([]);

  const undoRef = useRef<null | (() => void)>(null);
  const redoRef = useRef<null | (() => void)>(null);

  async function refresh() {
    setError(null);
    setLoading(true);
    try {
      const next = await fetchNotes();
      setNotes(next);
      setLastSaved(buildLastSaved(next));
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed to load notes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setError(null);
      setLoading(true);
      try {
        const storedUndo = safeParseJson<NotesAction[]>(
          window.localStorage.getItem("madhouse-notes-undo"),
        );
        const storedRedo = safeParseJson<NotesAction[]>(
          window.localStorage.getItem("madhouse-notes-redo"),
        );

        if (!cancelled && Array.isArray(storedUndo)) setUndoStack(storedUndo);
        if (!cancelled && Array.isArray(storedRedo)) setRedoStack(storedRedo);

        const [token, next] = await Promise.all([
          fetchCsrfToken(),
          fetchNotes(),
        ]);
        if (!cancelled) setCsrfToken(token);
        if (!cancelled) {
          setNotes(next);
          setLastSaved(buildLastSaved(next));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "failed to load notes");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      "madhouse-notes-undo",
      JSON.stringify(undoStack),
    );
    window.localStorage.setItem(
      "madhouse-notes-redo",
      JSON.stringify(redoStack),
    );
  }, [redoStack, undoStack]);

  useEffect(() => {
    const url = getRealtimeWsUrl();
    if (!url) return;

    const ws = new WebSocket(url);

    ws.onmessage = async (event) => {
      const data = safeParseJson<{ type?: string }>(String(event.data));
      if (!data || data.type !== "notes:changed") return;

      try {
        const next = await fetchNotes();
        setNotes(next);
        setLastSaved(buildLastSaved(next));
        setUndoStack([]);
        setRedoStack([]);
      } catch {
        // ignore
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  async function apiCreate(note: Note) {
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        id: note.id,
        created_at: note.created_at,
        title: note.title,
        body: note.body,
      }),
    });

    const json = (await res.json().catch(() => null)) as NotesApiSingle | null;

    if (!res.ok) {
      throw new Error(json?.error ?? "failed to create note");
    }

    if (!json?.note) throw new Error("missing note");
    return json.note;
  }

  async function apiUpdate(note: Note) {
    const res = await fetch(`/api/notes/${note.id}`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({ title: note.title, body: note.body }),
    });

    const json = (await res.json().catch(() => null)) as NotesApiSingle | null;

    if (!res.ok) {
      throw new Error(json?.error ?? "failed to update note");
    }

    if (!json?.note) throw new Error("missing note");
    return json.note;
  }

  async function apiDelete(id: string) {
    const res = await fetch(`/api/notes/${id}`, {
      method: "DELETE",
      headers: {
        "x-csrf-token": csrfToken,
      },
    });

    const json = (await res.json().catch(() => null)) as {
      ok: boolean;
      error?: string;
    } | null;

    if (!res.ok) {
      throw new Error(json?.error ?? "failed to delete note");
    }
  }

  async function createNote() {
    setError(null);
    if (!csrfToken) {
      setError("missing csrf token");
      return;
    }

    const temp: Note = {
      id: crypto.randomUUID(),
      title: title.trim(),
      body,
      created_at: new Date().toISOString(),
    };

    if (!temp.title) return;

    try {
      const created = await apiCreate(temp);
      setTitle("");
      setBody("");
      setNotes((prev) => [created, ...prev]);
      setLastSaved((prev) => ({ ...prev, [created.id]: created }));
      setUndoStack((prev) => pushUndo(prev, { kind: "create", note: created }));
      setRedoStack([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed to create note");
    }
  }

  async function saveNote(note: Note) {
    setError(null);
    if (!csrfToken) {
      setError("missing csrf token");
      return;
    }

    const before = lastSaved[note.id];
    if (!before) {
      await refresh();
      return;
    }

    if (before.title === note.title && before.body === note.body) {
      return;
    }

    try {
      const updated = await apiUpdate(note);
      setNotes((prev) => prev.map((n) => (n.id === note.id ? updated : n)));
      setLastSaved((prev) => ({ ...prev, [note.id]: updated }));
      setUndoStack((prev) =>
        pushUndo(prev, { kind: "update", before, after: updated }),
      );
      setRedoStack([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed to update note");
    }
  }

  async function removeNote(note: Note) {
    setError(null);
    if (!csrfToken) {
      setError("missing csrf token");
      return;
    }

    try {
      await apiDelete(note.id);
      setNotes((prev) => prev.filter((n) => n.id !== note.id));
      setLastSaved((prev) => {
        const copy = { ...prev };
        delete copy[note.id];
        return copy;
      });
      setUndoStack((prev) => pushUndo(prev, { kind: "delete", note }));
      setRedoStack([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed to delete note");
    }
  }

  async function applyAction(action: NotesAction, direction: "undo" | "redo") {
    if (!csrfToken) {
      throw new Error("missing csrf token");
    }

    if (action.kind === "create") {
      if (direction === "undo") {
        await apiDelete(action.note.id);
        setNotes((prev) => prev.filter((n) => n.id !== action.note.id));
        setLastSaved((prev) => {
          const copy = { ...prev };
          delete copy[action.note.id];
          return copy;
        });
        return;
      }

      const restored = await apiCreate(action.note);
      setNotes((prev) => [restored, ...prev]);
      setLastSaved((prev) => ({ ...prev, [restored.id]: restored }));
      return;
    }

    if (action.kind === "delete") {
      if (direction === "undo") {
        const restored = await apiCreate(action.note);
        setNotes((prev) => [restored, ...prev]);
        setLastSaved((prev) => ({ ...prev, [restored.id]: restored }));
        return;
      }

      await apiDelete(action.note.id);
      setNotes((prev) => prev.filter((n) => n.id !== action.note.id));
      setLastSaved((prev) => {
        const copy = { ...prev };
        delete copy[action.note.id];
        return copy;
      });
      return;
    }

    const target = direction === "undo" ? action.before : action.after;
    const updated = await apiUpdate(target);
    setNotes((prev) => prev.map((n) => (n.id === target.id ? updated : n)));
    setLastSaved((prev) => ({ ...prev, [target.id]: updated }));
  }

  async function undo() {
    setError(null);
    const { item, rest } = popLast(undoStack);
    if (!item) return;

    try {
      await applyAction(item, "undo");
      setUndoStack(rest);
      setRedoStack((prev) => pushUndo(prev, item));
    } catch (err) {
      setError(err instanceof Error ? err.message : "undo failed");
    }
  }

  async function redo() {
    setError(null);
    const { item, rest } = popLast(redoStack);
    if (!item) return;

    try {
      await applyAction(item, "redo");
      setRedoStack(rest);
      setUndoStack((prev) => pushUndo(prev, item));
    } catch (err) {
      setError(err instanceof Error ? err.message : "redo failed");
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
        // Keep native text undo/redo inside inputs.
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

  return (
    <div className="space-y-6">
      <div className="space-y-3 rounded-2xl border border-border/60 bg-card p-5">
        <div className="space-y-1">
          <p className="text-sm font-semibold">Create a note</p>
          <p className="text-sm text-muted-foreground">
            Stored in sqlite at <code className="font-mono">data/app.db</code>.
          </p>
        </div>

        <div className="grid gap-3">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Title"
          />
          <NoteBodyEditor
            value={body}
            onChange={setBody}
            placeholder="Body (Markdown)"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={createNote} disabled={!title.trim() || !csrfToken}>
              Create
            </Button>
            <Button variant="outline" onClick={refresh} disabled={loading}>
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={undo}
              disabled={undoStack.length === 0}
              title="Undo (Ctrl+Z / Cmd+Z)"
            >
              Undo
            </Button>
            <Button
              variant="outline"
              onClick={redo}
              disabled={redoStack.length === 0}
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
          <h2 className="text-lg font-semibold">Latest notes</h2>
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
                disabled={!csrfToken}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" onClick={() => removeNote(note)}>
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
