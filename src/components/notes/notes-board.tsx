"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  type Modifier,
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
import { useAtom } from "jotai";
import { Pencil, Pin, PinOff, Trash2, X } from "lucide-react";
import { type CSSProperties, useEffect, useId, useRef, useState } from "react";

import { E2EEDekUnlockCard } from "@/components/crypto/e2ee-dek-unlock-card";
import { NoteBodyEditor } from "@/components/notes/note-body-editor";
import { NoteMarkdownContent } from "@/components/notes/note-markdown-content";
import { Button } from "@/components/roiui/button";
import { Input } from "@/components/roiui/input";
import { Toolbar, ToolbarGroup } from "@/components/roiui/toolbar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ModalDialog } from "@/components/ui/modal-dialog";
import { Separator } from "@/components/ui/separator";
import { encryptJson } from "@/lib/crypto/webcrypto";
import {
  arrayMove,
  mergeNoteOrderIds,
  type NotesBoardOrder,
  toUniqueStringArray,
} from "@/lib/notes-board-order";
import type { NoteSnapshot } from "@/lib/notes-e2ee/model";
import {
  fetchNotesRuntimeSnapshot,
  postNotesHistoryEvent,
  subscribeNotesRuntime,
} from "@/lib/runtime/notes-runtime";
import {
  notesCanRedoAtom,
  notesCanUndoAtom,
  notesCsrfTokenAtom,
  notesDekKeyAtom,
  notesErrorAtom,
  notesEventsAtom,
  notesListAtom,
  notesLoadingAtom,
  notesRedoTargetEventIdAtom,
  notesUndoTargetEventIdAtom,
} from "@/lib/runtime/notes-state";
import { cn, safeParseJson } from "@/lib/utils";

const NOTES_PINS_STORAGE_KEY = "madhouse-notes-pins";
const NOTES_ORDER_STORAGE_KEY = "madhouse-notes-order";
const DRAG_ACTIVATION_DISTANCE = 6;

type NotesBoardSection = "pinned" | "other";
type SortableAttributes = ReturnType<typeof useSortable>["attributes"];
type SortableListeners = ReturnType<typeof useSortable>["listeners"];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

const clampToContainerBounds: Modifier = ({
  transform,
  containerNodeRect,
  draggingNodeRect,
}) => {
  if (!containerNodeRect || !draggingNodeRect) return transform;

  const minX = containerNodeRect.left - draggingNodeRect.left;
  const maxX = containerNodeRect.right - draggingNodeRect.right;
  const minY = containerNodeRect.top - draggingNodeRect.top;
  const maxY = containerNodeRect.bottom - draggingNodeRect.bottom;

  return {
    ...transform,
    x: clamp(transform.x, Math.min(minX, maxX), Math.max(minX, maxX)),
    y: clamp(transform.y, Math.min(minY, maxY), Math.max(minY, maxY)),
  };
};

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

// (moved into E2EEDekUnlockCard)

// (moved into E2EEDekUnlockCard)

// (moved into E2EEDekUnlockCard)

export function NotesBoard() {
  const [csrfToken, setCsrfToken] = useAtom(notesCsrfTokenAtom);
  const [dekKey, setDekKey] = useAtom(notesDekKeyAtom);

  const [notes, setNotes] = useAtom(notesListAtom);
  const [events, setEvents] = useAtom(notesEventsAtom);

  const [canUndo, setCanUndo] = useAtom(notesCanUndoAtom);
  const [canRedo, setCanRedo] = useAtom(notesCanRedoAtom);
  const [undoTargetEventId, setUndoTargetEventId] = useAtom(
    notesUndoTargetEventIdAtom,
  );
  const [redoTargetEventId, setRedoTargetEventId] = useAtom(
    notesRedoTargetEventIdAtom,
  );

  const [loading, setLoading] = useAtom(notesLoadingAtom);
  const [error, setError] = useAtom(notesErrorAtom);

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
    useSensor(PointerSensor, {
      activationConstraint: { distance: DRAG_ACTIVATION_DISTANCE },
    }),
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
  const createPreviewDialogTitleId = useId();

  const [viewingNoteId, setViewingNoteId] = useState<string | null>(null);
  const viewingNote =
    viewingNoteId === null
      ? null
      : (notes.find((note) => note.id === viewingNoteId) ?? null);

  const [editingNote, setEditingNote] = useState<NoteSnapshot | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingBody, setEditingBody] = useState("");
  const [creationPreviewOpen, setCreationPreviewOpen] = useState(false);

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
        const snapshot = await fetchNotesRuntimeSnapshot(dekKey);
        setEvents(snapshot.events);
        setNotes(snapshot.notes);
        setCanUndo(snapshot.canUndo);
        setCanRedo(snapshot.canRedo);
        setUndoTargetEventId(snapshot.undoTargetEventId);
        setRedoTargetEventId(snapshot.redoTargetEventId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "history_failed");
      } finally {
        setLoading(false);
      }
    };
  }, [
    dekKey,
    setCanRedo,
    setCanUndo,
    setError,
    setEvents,
    setLoading,
    setNotes,
    setRedoTargetEventId,
    setUndoTargetEventId,
  ]);

  async function handleUnlocked(result: {
    csrfToken: string;
    dekKey: CryptoKey;
  }) {
    setCsrfToken(result.csrfToken);
    setDekKey(result.dekKey);

    setError(null);
    setLoading(true);
    try {
      const snapshot = await fetchNotesRuntimeSnapshot(result.dekKey);
      setEvents(snapshot.events);
      setNotes(snapshot.notes);
      setCanUndo(snapshot.canUndo);
      setCanRedo(snapshot.canRedo);
      setUndoTargetEventId(snapshot.undoTargetEventId);
      setRedoTargetEventId(snapshot.redoTargetEventId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "history_failed");
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
    return subscribeNotesRuntime(() => {
      void refreshRef.current?.();
    });
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
      await postNotesHistoryEvent({
        csrfToken,
        kind: "create",
        noteId: snapshot.id,
        payload,
      });

      setTitle("");
      setBody("");
      setCreationPreviewOpen(false);
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
      await postNotesHistoryEvent({
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
      await postNotesHistoryEvent({ csrfToken, kind: "delete", noteId });
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
      await postNotesHistoryEvent({
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
      await postNotesHistoryEvent({
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
    <div className="flex flex-col gap-6">
      {!dekKey ? (
        <E2EEDekUnlockCard
          label="Unlock Notes"
          description="Notes are end-to-end encrypted. Set a passphrase once, then unlock on each device."
          onUnlocked={handleUnlocked}
        />
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Create a note (E2EE)</CardTitle>
          <CardDescription>
            Notes are end-to-end encrypted and stored as an append-only event
            log.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
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
              onClick={() => setCreationPreviewOpen(true)}
              disabled={(!title.trim() && !body.trim()) || !dekKey}
            >
              Preview
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
        </CardContent>
      </Card>

      <ModalDialog
        open={creationPreviewOpen}
        onOpenChange={setCreationPreviewOpen}
        labelledBy={createPreviewDialogTitleId}
        className="m-auto w-[min(96vw,64rem)] max-h-[min(90vh,56rem)] overflow-y-auto"
      >
        <div className="divide-y divide-border/70">
          <div className="flex items-start justify-between gap-4 p-6">
            <div className="space-y-1">
              <h2
                id={createPreviewDialogTitleId}
                className="text-lg font-semibold"
              >
                Create preview
              </h2>
              <p className="text-xs text-muted-foreground">
                This is how the note body formatting will appear.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0"
              onClick={() => setCreationPreviewOpen(false)}
            >
              <X className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
          <div className="space-y-4 p-6">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">
                {title.trim() || "Untitled"}
              </h3>
              <div className="max-h-[55vh] overflow-auto rounded-2xl border border-border/70 bg-background p-4">
                <NoteMarkdownContent body={body} />
              </div>
            </div>
            <Toolbar className="justify-end gap-2">
              <ToolbarGroup>
                <Button
                  variant="outline"
                  onClick={() => setCreationPreviewOpen(false)}
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    void createNote();
                  }}
                  disabled={!title.trim() || !dekKey}
                >
                  Create
                </Button>
              </ToolbarGroup>
            </Toolbar>
          </div>
        </div>
      </ModalDialog>

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
          modifiers={[clampToContainerBounds]}
          onDragEnd={handleDragEnd}
        >
          <div className="space-y-6 overflow-hidden">
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
          </div>
        </DndContext>
      </div>

      <ModalDialog
        open={viewingNoteId !== null || editingNote !== null}
        onOpenChange={(open) => {
          if (open) return;
          setConfirmingDelete(false);
          setEditingNote(null);
          setViewingNoteId(null);
        }}
        labelledBy={editingNote ? editDialogTitleId : viewDialogTitleId}
        className="m-auto w-[min(96vw,64rem)] max-h-[min(90vh,56rem)] overflow-y-auto"
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
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0"
                onClick={() => {
                  setEditingNote(null);
                }}
              >
                <X className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">Close</span>
              </Button>
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
              <Toolbar className="justify-end gap-2">
                <ToolbarGroup>
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
                </ToolbarGroup>
              </Toolbar>
            </div>
          </div>
        ) : viewingNote ? (
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
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0"
                onClick={closeViewingNote}
              >
                <X className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">Close</span>
              </Button>
            </div>

            <div className="space-y-5 p-6">
              <Toolbar className="justify-start gap-2">
                <ToolbarGroup className="flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
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
                </ToolbarGroup>
              </Toolbar>

              {error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : null}

              <Separator />

              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Body</h3>
                <div className="max-h-[55vh] overflow-auto rounded-2xl border border-border/70 bg-background p-4">
                  <NoteMarkdownContent body={viewingNote.body} />
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
    // Avoid “trailing behind the cursor” feeling by disabling transitions during drag.
    transition: isDragging ? undefined : transition,
    willChange: "transform",
  };

  return (
    <NoteCard
      note={note}
      pinned={pinned}
      onOpen={onOpen}
      isDragging={isDragging}
      outerRef={setNodeRef}
      style={style}
      dragAttributes={attributes}
      dragListeners={listeners}
      dragSurfaceRef={setActivatorNodeRef}
    />
  );
}

function NoteCard({
  note,
  pinned,
  onOpen,
  dragAttributes,
  dragListeners,
  dragSurfaceRef,
  isDragging = false,
  outerRef,
  style,
}: {
  note: NoteSnapshot;
  pinned: boolean;
  onOpen: () => void;
  dragAttributes: SortableAttributes;
  dragListeners: SortableListeners;
  dragSurfaceRef?: (node: HTMLButtonElement | null) => void;
  isDragging?: boolean;
  outerRef?: (node: HTMLDivElement | null) => void;
  style?: CSSProperties;
}) {
  const title = note.title.trim() || "Untitled";
  const pointerStartRef = useRef<{
    id: number;
    clientX: number;
    clientY: number;
  } | null>(null);
  const suppressClickRef = useRef(false);

  return (
    <div
      ref={outerRef}
      style={style}
      data-dragging={isDragging ? "true" : "false"}
    >
      <Card className="group relative space-y-3 p-5 transition hover:-translate-y-0.5 hover:shadow-md">
        {pinned ? (
          <span
            role="img"
            aria-label="Pinned note"
            className="pointer-events-none absolute left-3 top-3 z-20 inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/70 bg-background text-muted-foreground shadow-sm"
          >
            <Pin className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        ) : null}
        <button
          type="button"
          ref={dragSurfaceRef}
          aria-label={`Open note: ${title}`}
          onPointerDownCapture={(event) => {
            if (event.button !== 0) return;
            pointerStartRef.current = {
              id: event.pointerId,
              clientX: event.clientX,
              clientY: event.clientY,
            };
            suppressClickRef.current = false;
          }}
          onPointerMoveCapture={(event) => {
            const pointerStart = pointerStartRef.current;
            if (!pointerStart || pointerStart.id !== event.pointerId) return;
            if (suppressClickRef.current) return;

            const distance = Math.hypot(
              event.clientX - pointerStart.clientX,
              event.clientY - pointerStart.clientY,
            );
            if (distance >= DRAG_ACTIVATION_DISTANCE) {
              suppressClickRef.current = true;
            }
          }}
          onPointerUpCapture={(event) => {
            if (pointerStartRef.current?.id !== event.pointerId) return;
            pointerStartRef.current = null;
          }}
          onPointerCancelCapture={() => {
            pointerStartRef.current = null;
          }}
          onClick={(event) => {
            if (suppressClickRef.current || isDragging) {
              event.preventDefault();
              event.stopPropagation();
              suppressClickRef.current = false;
              return;
            }

            onOpen();
          }}
          className="absolute inset-0 z-10 touch-none cursor-pointer rounded-2xl bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          {...dragAttributes}
          {...dragListeners}
        />
        <div className="relative flex items-start gap-3">
          <input
            value={note.title}
            placeholder="Untitled"
            readOnly
            tabIndex={-1}
            aria-hidden="true"
            className={cn(
              "pointer-events-none h-auto w-full truncate rounded-none border-0 bg-transparent p-0 text-base font-semibold leading-6 text-foreground shadow-none outline-none",
              pinned ? "pl-8" : "",
            )}
          />
        </div>

        <div className="relative max-h-28 overflow-hidden">
          <NoteMarkdownContent
            body={note.body}
            maxBlocks={3}
            className="text-muted-foreground"
          />
        </div>

        <p className="relative text-xs text-muted-foreground">
          {formatCreatedAt(note.created_at)}
        </p>
      </Card>
    </div>
  );
}
