export type NotesEventKind = "create" | "update" | "delete" | "undo" | "redo";

export type NoteSnapshot = {
  id: string;
  title: string;
  body: string;
  created_at: string;
};

export type NotesEvent = {
  id: string;
  created_at: string;
  kind: NotesEventKind;
  note_id: string;
  target_event_id: string | null;
  payload_iv: string | null;
  payload_ciphertext: string | null;

  // client-only
  note?: NoteSnapshot;
};

export function applyNotesEvents(events: NotesEvent[]) {
  // Two-pass approach so undo/redo can affect earlier actions.
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

  const notesById = new Map<string, NoteSnapshot>();
  const appliedActionIds: string[] = [];

  for (const e of events) {
    if (e.kind === "undo" || e.kind === "redo") continue;
    if (undone.has(e.id)) continue;

    if (e.kind === "delete") {
      notesById.delete(e.note_id);
      appliedActionIds.push(e.id);
      continue;
    }

    if ((e.kind === "create" || e.kind === "update") && e.note) {
      notesById.set(e.note_id, e.note);
      appliedActionIds.push(e.id);
    }
  }

  const notes = Array.from(notesById.values()).sort((a, b) => {
    return b.created_at.localeCompare(a.created_at);
  });

  const canUndo = appliedActionIds.length > 0;
  const canRedo = undoneStack.length > 0;

  const undoTargetEventId = canUndo
    ? appliedActionIds[appliedActionIds.length - 1]
    : null;
  const redoTargetEventId = canRedo
    ? undoneStack[undoneStack.length - 1]
    : null;

  return {
    notes,
    canUndo,
    canRedo,
    undoTargetEventId,
    redoTargetEventId,
  };
}
