import { describe, expect, test } from "bun:test";

import { applyNotesEvents, type NotesEvent } from "@/lib/notes-e2ee/model";

function e(partial: Partial<NotesEvent> & { id: string }) {
  return {
    id: partial.id,
    created_at: partial.created_at ?? "2026-01-01T00:00:00.000Z",
    kind: partial.kind ?? "create",
    note_id: partial.note_id ?? "n1",
    target_event_id: partial.target_event_id ?? null,
    payload_iv: partial.payload_iv ?? null,
    payload_ciphertext: partial.payload_ciphertext ?? null,
    note: partial.note,
  } satisfies NotesEvent;
}

describe("applyNotesEvents", () => {
  test("create then update produces latest note", () => {
    const state = applyNotesEvents([
      e({
        id: "e1",
        kind: "create",
        note: { id: "n1", title: "A", body: "", created_at: "2026-01-01" },
      }),
      e({
        id: "e2",
        kind: "update",
        note: { id: "n1", title: "B", body: "x", created_at: "2026-01-01" },
      }),
    ]);

    expect(state.notes).toEqual([
      { id: "n1", title: "B", body: "x", created_at: "2026-01-01" },
    ]);
    expect(state.canUndo).toBe(true);
    expect(state.undoTargetEventId).toBe("e2");
  });

  test("undo cancels the target action", () => {
    const state = applyNotesEvents([
      e({
        id: "e1",
        kind: "create",
        note: { id: "n1", title: "A", body: "", created_at: "2026-01-01" },
      }),
      e({ id: "u1", kind: "undo", target_event_id: "e1" }),
    ]);

    expect(state.notes).toEqual([]);
    expect(state.canRedo).toBe(true);
    expect(state.redoTargetEventId).toBe("e1");
  });

  test("redo restores", () => {
    const state = applyNotesEvents([
      e({
        id: "e1",
        kind: "create",
        note: { id: "n1", title: "A", body: "", created_at: "2026-01-01" },
      }),
      e({ id: "u1", kind: "undo", target_event_id: "e1" }),
      e({ id: "r1", kind: "redo", target_event_id: "e1" }),
    ]);

    expect(state.notes).toEqual([
      { id: "n1", title: "A", body: "", created_at: "2026-01-01" },
    ]);
    expect(state.canRedo).toBe(false);
  });

  test("delete removes note", () => {
    const state = applyNotesEvents([
      e({
        id: "e1",
        kind: "create",
        note: { id: "n1", title: "A", body: "", created_at: "2026-01-01" },
      }),
      e({ id: "d1", kind: "delete", note_id: "n1" }),
    ]);

    expect(state.notes).toEqual([]);
    expect(state.undoTargetEventId).toBe("d1");
  });
});
