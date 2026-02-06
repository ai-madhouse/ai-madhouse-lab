"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Pin, PinOff, Trash2, X } from "lucide-react";
import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import { E2EEDekUnlockCard } from "@/components/crypto/e2ee-dek-unlock-card";
import { NoteBodyEditor } from "@/components/notes/note-body-editor";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { ModalDialog } from "@/components/ui/modal-dialog";
import { Separator } from "@/components/ui/separator";
import { Tooltip } from "@/components/ui/tooltip";
import { decryptJson, encryptJson } from "@/lib/crypto/webcrypto";
import {
  arrayMove,
  mergeNoteOrderIds,
  type NotesBoardOrder,
  toUniqueStringArray,
} from "@/lib/notes-board-order";
import {
  applyNotesEvents,
  type NoteSnapshot,
  type NotesEvent,
  type NotesEventKind,
} from "@/lib/notes-e2ee/model";
import { getRealtimeWsUrl } from "@/lib/realtime-url";
import { safeParseJson } from "@/lib/utils";

type NotesHistoryRow = {
  id: string;
  created_at: string;
  kind: NotesEventKind;
  note_id: string;
  target_event_id: string | null;
  payload_iv: string | null;
  payload_ciphertext: string | null;
};

const NOTES_PINS_STORAGE_KEY = "madhouse-notes-pins";
const NOTES_ORDER_STORAGE_KEY = "madhouse-notes-order";

type NotesBoardSection = "pinned" | "other";

function readNotesOrderFromStorage(): NotesBoardOrder {
  if (typeof window === "undefined") return { pinned: [], other: [] };

  const stored = safeParseJson<unknown>(
    window.localStorage.getItem(NOTES_ORDER_STORAGE_KEY),
  );

  if (!stored) return { pinned: [], other: [] };

  // Legacy shape: a single array was treated as "other".
  if (Array.isArray(stored)) {
    return { pinned: [], other: toUniqueStringArray(stored) };
  }

  if (typeof stored !== "object") return { pinned: [], other: [] };

  const pinned = toUniqueStringArray(
    (stored as { pinned?: unknown }).pinned ?? [],
  );
  const other = toUniqueStringArray(
    (stored as { other?: unknown }).other ?? [],
  );

  return { pinned, other };
}

function readPinnedNoteIdsFromStorage(): string[] {
  if (typeof window === "undefined") return [];

  const stored = safeParseJson<unknown>(
    window.localStorage.getItem(NOTES_PINS_STORAGE_KEY),
  );

  if (!Array.isArray(stored)) return [];

  const ids = stored.filter((value) => typeof value === "string");
  return Array.from(new Set(ids));
}

function formatCreatedAt(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString();
}

function buildBodyPreview(body: string, maxLength = 240) {
  const text = body.trim();
  if (!text) return "";

  const singleLine = text.replace(/\s+/g, " ");
  if (singleLine.length <= maxLength) return singleLine;
  return `${singleLine.slice(0, maxLength).trimEnd()}…`;
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

export function NotesBoard() {
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

  const [pinnedNoteIds, setPinnedNoteIds] = useState<string[]>([]);
  const pinnedNoteIdSet = new Set(pinnedNoteIds);
  const pinnedStorageReadyRef = useRef(false);

  const [notesOrder, setNotesOrder] = useState<NotesBoardOrder>({
    pinned: [],
    other: [],
  });
  const notesOrderStorageReadyRef = useRef(false);

  const undoRef = useRef<null | (() => void)>(null);
  const redoRef = useRef<null | (() => void)>(null);

  const refreshRef = useRef<null | (() => Promise<void>)>(null);

  useEffect(() => {
    setPinnedNoteIds(readPinnedNoteIdsFromStorage());
  }, []);

  useEffect(() => {
    setNotesOrder(readNotesOrderFromStorage());
  }, []);

  useEffect(() => {
    if (!pinnedStorageReadyRef.current) {
      pinnedStorageReadyRef.current = true;
      return;
    }

    try {
      window.localStorage.setItem(
        NOTES_PINS_STORAGE_KEY,
        JSON.stringify(pinnedNoteIds),
      );
    } catch {
      // ignore
    }
  }, [pinnedNoteIds]);

  useEffect(() => {
    if (!notesOrderStorageReadyRef.current) {
      notesOrderStorageReadyRef.current = true;
      return;
    }

    try {
      window.localStorage.setItem(
        NOTES_ORDER_STORAGE_KEY,
        JSON.stringify(notesOrder),
      );
    } catch {
      // ignore
    }
  }, [notesOrder]);

  function isPinned(noteId: string) {
    return pinnedNoteIdSet.has(noteId);
  }

  function togglePinned(noteId: string) {
    setPinnedNoteIds((prev) => {
      if (prev.includes(noteId)) {
        return prev.filter((id) => id !== noteId);
      }
      return [noteId, ...prev];
    });
  }

  const notesById = new Map<string, NoteSnapshot>();
  const pinnedNoteIdsInDefaultOrder: string[] = [];
  const otherNoteIdsInDefaultOrder: string[] = [];

  for (const note of notes) {
    notesById.set(note.id, note);

    if (pinnedNoteIdSet.has(note.id)) {
      pinnedNoteIdsInDefaultOrder.push(note.id);
      continue;
    }

    otherNoteIdsInDefaultOrder.push(note.id);
  }

  const pinnedNoteOrderIds = mergeNoteOrderIds(
    notesOrder.pinned,
    pinnedNoteIdsInDefaultOrder,
  );
  const otherNoteOrderIds = mergeNoteOrderIds(
    notesOrder.other,
    otherNoteIdsInDefaultOrder,
  );

  const pinnedNotes: NoteSnapshot[] = [];
  const otherNotes: NoteSnapshot[] = [];

  for (const noteId of pinnedNoteOrderIds) {
    const note = notesById.get(noteId);
    if (!note) continue;
    pinnedNotes.push(note);
  }

  for (const noteId of otherNoteOrderIds) {
    const note = notesById.get(noteId);
    if (!note) continue;
    otherNotes.push(note);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeSection = active.data.current?.section;
    const overSection = over.data.current?.section;

    if (activeSection !== overSection) return;
    if (activeSection !== "pinned" && activeSection !== "other") return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId === overId) return;

    const currentIds =
      activeSection === "pinned" ? pinnedNoteOrderIds : otherNoteOrderIds;
    const oldIndex = currentIds.indexOf(activeId);
    const newIndex = currentIds.indexOf(overId);
    if (oldIndex === -1 || newIndex === -1) return;

    const nextIds = arrayMove(currentIds, oldIndex, newIndex);
    setNotesOrder((prev) => ({ ...prev, [activeSection]: nextIds }));
  }

  const viewDialogTitleId = useId();
  const editDialogTitleId = useId();

  const [viewingNoteId, setViewingNoteId] = useState<string | null>(null);
  const viewingNote =
    viewingNoteId === null
      ? null
      : (notes.find((note) => note.id === viewingNoteId) ?? null);

  const [editingNote, setEditingNote] = useState<NoteSnapshot | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingBody, setEditingBody] = useState("");

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const deletingRef = useRef(false);

  function openViewingNote(noteId: string) {
    setConfirmingDelete(false);
    setViewingNoteId(noteId);
  }

  function closeViewingNote() {
    setConfirmingDelete(false);
    setViewingNoteId(null);
  }

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
      return false;
    }
    if (!dekKey) {
      setError("notes are locked");
      return false;
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
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed to save");
      return false;
    }
  }

  async function deleteNote(noteId: string) {
    setError(null);
    if (!csrfToken) {
      setError("missing csrf token");
      return false;
    }

    try {
      await postHistoryEvent({ csrfToken, kind: "delete", noteId });
      await refreshRef.current?.();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed to delete");
      return false;
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

  useEffect(() => {
    if (!viewingNoteId) return;
    if (viewingNote) return;
    if (loading) return;
    setConfirmingDelete(false);
    setViewingNoteId(null);
  }, [loading, viewingNote, viewingNoteId]);

  function startEditing(note: NoteSnapshot) {
    setEditingNote(note);
    setEditingTitle(note.title);
    setEditingBody(note.body);
  }

  function cancelEditing() {
    if (!editingNote) return;
    setEditingNote(null);
    openViewingNote(editingNote.id);
  }

  async function commitEditing() {
    if (!editingNote) return;

    const ok = await saveNote({
      ...editingNote,
      title: editingTitle,
      body: editingBody,
    });

    if (!ok) return;

    setEditingNote(null);
    openViewingNote(editingNote.id);
  }

  async function commitDelete(noteId: string) {
    if (deletingRef.current) return;
    deletingRef.current = true;
    setDeleting(true);

    const ok = await deleteNote(noteId);
    if (ok) {
      setPinnedNoteIds((prev) => prev.filter((id) => id !== noteId));
      closeViewingNote();
    }

    deletingRef.current = false;
    setDeleting(false);
  }

  const deleteDialogNoteTitle = viewingNote
    ? viewingNote.title.trim() || "Untitled"
    : "Untitled";

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

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Notes</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : null}
        </div>

        {notes.length === 0 && !loading ? (
          <p className="text-sm text-muted-foreground">No notes yet.</p>
        ) : null}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          {pinnedNotes.length > 0 ? (
            <section
              className="space-y-3"
              aria-labelledby="notes-pinned-heading"
            >
              <h3
                id="notes-pinned-heading"
                className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground"
              >
                Pinned
              </h3>
              <SortableContext
                items={pinnedNoteOrderIds}
                strategy={rectSortingStrategy}
              >
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {pinnedNotes.map((note) => (
                    <SortableNoteCard
                      key={note.id}
                      note={note}
                      pinned
                      section="pinned"
                      onOpen={() => openViewingNote(note.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </section>
          ) : null}

          {otherNotes.length > 0 ? (
            <section
              className="space-y-3"
              aria-labelledby="notes-other-heading"
            >
              <h3
                id="notes-other-heading"
                className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground"
              >
                {pinnedNotes.length > 0 ? "Others" : "All notes"}
              </h3>
              <SortableContext
                items={otherNoteOrderIds}
                strategy={rectSortingStrategy}
              >
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {otherNotes.map((note) => (
                    <SortableNoteCard
                      key={note.id}
                      note={note}
                      pinned={false}
                      section="other"
                      onOpen={() => openViewingNote(note.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </section>
          ) : null}
        </DndContext>
      </div>

      <ModalDialog
        open={viewingNoteId !== null}
        onOpenChange={(open) => {
          if (!open) closeViewingNote();
        }}
        labelledBy={viewDialogTitleId}
        className="w-[min(96vw,56rem)]"
      >
        {viewingNote ? (
          <div className="divide-y divide-border/70">
            <div className="flex items-start justify-between gap-4 p-6">
              <div className="space-y-1">
                <h2 id={viewDialogTitleId} className="text-lg font-semibold">
                  {viewingNote.title.trim() || "Untitled"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {formatCreatedAt(viewingNote.created_at)}
                </p>
              </div>
              <Tooltip content="Close">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0"
                  onClick={closeViewingNote}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">Close</span>
                </Button>
              </Tooltip>
            </div>

            <div className="space-y-5 p-6">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    closeViewingNote();
                    startEditing(viewingNote);
                  }}
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => togglePinned(viewingNote.id)}
                >
                  {isPinned(viewingNote.id) ? (
                    <PinOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Pin className="h-4 w-4" aria-hidden="true" />
                  )}
                  {isPinned(viewingNote.id) ? "Unpin" : "Pin"}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setConfirmingDelete(true)}
                  disabled={confirmingDelete || deleting}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Delete
                </Button>
              </div>

              {error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : null}

              <Separator />

              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Body</h3>
                <div className="max-h-[55vh] overflow-auto rounded-2xl border border-border/70 bg-background p-4">
                  {viewingNote.body.trim() ? (
                    <p className="whitespace-pre-wrap text-sm leading-6">
                      {viewingNote.body}
                    </p>
                  ) : (
                    <p className="text-sm italic text-muted-foreground">
                      Empty note.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 p-6">
            <h2 id={viewDialogTitleId} className="text-lg font-semibold">
              Note
            </h2>
            <p className="text-sm text-muted-foreground">Loading…</p>
          </div>
        )}
      </ModalDialog>

      <ConfirmDialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title="Delete note?"
        description={
          <>
            Delete “{deleteDialogNoteTitle}”? This cannot be undone.
            {deleting ? (
              <span className="mt-2 block text-sm text-muted-foreground">
                Deleting…
              </span>
            ) : null}
          </>
        }
        confirmLabel="Delete"
        cancelDisabled={deleting}
        confirmDisabled={deleting || !viewingNote}
        onConfirm={() => {
          if (!viewingNote) return;
          setConfirmingDelete(false);
          void commitDelete(viewingNote.id);
        }}
      />

      <ModalDialog
        open={editingNote !== null}
        onOpenChange={(open) => {
          if (!open) cancelEditing();
        }}
        labelledBy={editDialogTitleId}
        className="w-[min(96vw,56rem)]"
      >
        {editingNote ? (
          <div className="divide-y divide-border/70">
            <div className="flex items-start justify-between gap-4 p-6">
              <div className="space-y-1">
                <h2 id={editDialogTitleId} className="text-lg font-semibold">
                  Edit note
                </h2>
                <p className="text-xs text-muted-foreground">
                  {formatCreatedAt(editingNote.created_at)}
                </p>
              </div>
              <Tooltip content="Close">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0"
                  onClick={cancelEditing}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">Close</span>
                </Button>
              </Tooltip>
            </div>

            <div className="space-y-4 p-6">
              <Input
                value={editingTitle}
                onChange={(event) => setEditingTitle(event.target.value)}
                placeholder="Title"
                disabled={!dekKey}
              />
              <NoteBodyEditor
                value={editingBody}
                onChange={setEditingBody}
                onSave={() => {
                  void commitEditing();
                }}
                placeholder="Body (Markdown)"
                disabled={!dekKey}
              />
              {error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : null}
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button variant="outline" onClick={cancelEditing}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    void commitEditing();
                  }}
                  disabled={!dekKey}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 p-6">
            <h2 id={editDialogTitleId} className="text-lg font-semibold">
              Edit note
            </h2>
            <p className="text-sm text-muted-foreground">Loading…</p>
          </div>
        )}
      </ModalDialog>
    </div>
  );
}

function SortableNoteCard({
  note,
  pinned,
  section,
  onOpen,
}: {
  note: NoteSnapshot;
  pinned: boolean;
  section: NotesBoardSection;
  onOpen: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: note.id,
    data: { section },
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <NoteCard
      note={note}
      pinned={pinned}
      onOpen={onOpen}
      isDragging={isDragging}
      outerRef={setNodeRef}
      style={style}
      dragHandle={
        <button
          type="button"
          ref={setActivatorNodeRef}
          className="absolute right-3 top-3 z-20 inline-flex h-9 w-9 touch-none cursor-grab items-center justify-center rounded-full border border-border/70 bg-background/80 text-muted-foreground shadow-sm transition hover:text-foreground active:cursor-grabbing"
          aria-label="Reorder note"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" aria-hidden="true" />
        </button>
      }
    />
  );
}

function NoteCard({
  note,
  pinned,
  onOpen,
  dragHandle,
  isDragging = false,
  outerRef,
  style,
}: {
  note: NoteSnapshot;
  pinned: boolean;
  onOpen: () => void;
  dragHandle?: ReactNode;
  isDragging?: boolean;
  outerRef?: (node: HTMLDivElement | null) => void;
  style?: CSSProperties;
}) {
  const title = note.title.trim() || "Untitled";
  const preview = buildBodyPreview(note.body);

  return (
    <div
      ref={outerRef}
      style={style}
      className={`group relative space-y-3 rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${isDragging ? "opacity-60" : ""}`}
    >
      {dragHandle}
      <button
        type="button"
        aria-label={`Open note: ${title}`}
        onClick={onOpen}
        className="absolute inset-0 z-10 cursor-pointer rounded-2xl bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      />
      <div className="relative flex items-start justify-between gap-3">
        <input
          value={note.title}
          placeholder="Untitled"
          readOnly
          tabIndex={-1}
          aria-hidden="true"
          className="pointer-events-none h-auto w-full truncate rounded-none border-0 bg-transparent p-0 text-base font-semibold leading-6 text-foreground shadow-none outline-none"
        />
        {pinned ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background px-2 py-1 text-xs font-medium text-muted-foreground">
            <Pin className="h-3.5 w-3.5" aria-hidden="true" />
            Pinned
          </span>
        ) : null}
      </div>

      {preview ? (
        <p className="relative text-sm leading-6 text-muted-foreground">
          {preview}
        </p>
      ) : (
        <p className="relative text-sm italic text-muted-foreground">
          Empty note.
        </p>
      )}

      <p className="relative text-xs text-muted-foreground">
        {formatCreatedAt(note.created_at)}
      </p>
    </div>
  );
}
