"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Note = {
  id: string;
  title: string;
  body: string;
  created_at: string;
};

async function fetchNotes() {
  const res = await fetch("/api/notes", { cache: "no-store" });
  const json = (await res.json()) as { ok: boolean; notes?: Note[] };
  return json.notes ?? [];
}

export function NotesDemo() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [csrfToken, setCsrfToken] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  async function refresh() {
    setError(null);
    setLoading(true);
    try {
      const next = await fetchNotes();
      setNotes(next);
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
        const [csrfRes, next] = await Promise.all([
          fetch("/api/csrf", { cache: "no-store" }),
          fetchNotes(),
        ]);
        const csrfJson = (await csrfRes.json().catch(() => null)) as {
          ok: true;
          token: string;
        } | null;
        if (!cancelled && csrfJson?.ok) setCsrfToken(csrfJson.token);
        if (!cancelled) setNotes(next);
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

  async function createNote() {
    setError(null);
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({ title, body }),
    });

    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as { error?: string };
      setError(json?.error ?? "failed to create note");
      return;
    }

    setTitle("");
    setBody("");
    await refresh();
  }

  async function updateNote(note: Note) {
    setError(null);
    const res = await fetch(`/api/notes/${note.id}`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({ title: note.title, body: note.body }),
    });

    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as { error?: string };
      setError(json?.error ?? "failed to update note");
      return;
    }

    await refresh();
  }

  async function deleteNote(id: string) {
    setError(null);
    const res = await fetch(`/api/notes/${id}`, {
      method: "DELETE",
      headers: {
        "x-csrf-token": csrfToken,
      },
    });

    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as { error?: string };
      setError(json?.error ?? "failed to delete note");
      return;
    }

    await refresh();
  }

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
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Body"
            rows={4}
          />
          <div className="flex items-center gap-2">
            <Button onClick={createNote} disabled={!title.trim() || !csrfToken}>
              Create
            </Button>
            <Button variant="outline" onClick={refresh} disabled={loading}>
              Refresh
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
              <Textarea
                value={note.body}
                onChange={(event) =>
                  setNotes((prev) =>
                    prev.map((entry) =>
                      entry.id === note.id
                        ? { ...entry, body: event.target.value }
                        : entry,
                    ),
                  )
                }
                rows={4}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={() => updateNote(note)}>Save</Button>
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
