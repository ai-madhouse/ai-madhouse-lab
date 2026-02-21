import { afterEach, describe, expect, test } from "bun:test";

import {
  decryptNotesHistory,
  fetchNotesHistory,
  type NotesHistoryRow,
  postNotesHistoryEvent,
} from "@/lib/runtime/notes-runtime";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function createHistoryResponse(history: NotesHistoryRow[]) {
  return new Response(JSON.stringify({ ok: true, events: history }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

describe("notes runtime", () => {
  test("fetchNotesHistory validates API payload", async () => {
    const history: NotesHistoryRow[] = [
      {
        id: "event-1",
        username: "alice",
        created_at: "2026-01-01T00:00:00.000Z",
        kind: "create",
        note_id: "note-1",
        target_event_id: null,
        payload_iv: "iv-1",
        payload_ciphertext: "cipher-1",
      },
    ];

    globalThis.fetch = async (_input, _init) => createHistoryResponse(history);

    await expect(fetchNotesHistory()).resolves.toEqual(history);
  });

  test("fetchNotesHistory surfaces API error codes", async () => {
    globalThis.fetch = async (_input, _init) =>
      new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });

    await expect(fetchNotesHistory()).rejects.toThrow("unauthorized");
  });

  test("postNotesHistoryEvent validates write response", async () => {
    globalThis.fetch = async (_input, _init) =>
      new Response(JSON.stringify({ ok: true, id: "event-99" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });

    await expect(
      postNotesHistoryEvent({
        csrfToken: "csrf-token",
        kind: "delete",
        noteId: "note-1",
      }),
    ).resolves.toBe("event-99");
  });

  test("decryptNotesHistory derives atom-ready note state", async () => {
    const key = await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"],
    );

    const history: NotesHistoryRow[] = [
      {
        id: "event-create",
        username: "alice",
        created_at: "2026-01-01T00:00:00.000Z",
        kind: "create",
        note_id: "note-1",
        target_event_id: null,
        payload_iv: "iv",
        payload_ciphertext: "cipher",
      },
      {
        id: "event-update",
        username: "alice",
        created_at: "2026-01-01T00:01:00.000Z",
        kind: "update",
        note_id: "note-1",
        target_event_id: null,
        payload_iv: "iv-2",
        payload_ciphertext: "cipher-2",
      },
      {
        id: "event-delete",
        username: "alice",
        created_at: "2026-01-01T00:02:00.000Z",
        kind: "delete",
        note_id: "note-2",
        target_event_id: null,
        payload_iv: null,
        payload_ciphertext: null,
      },
    ];

    const decryptCalls: string[] = [];
    const snapshot = await decryptNotesHistory({
      key,
      history,
      decrypt: async ({ payload_ciphertext }) => {
        decryptCalls.push(payload_ciphertext);
        return {
          id: "note-1",
          title: payload_ciphertext,
          body: "body",
          created_at: "2026-01-01T00:00:00.000Z",
        };
      },
    });

    expect(decryptCalls).toEqual(["cipher", "cipher-2"]);
    expect(snapshot.events).toHaveLength(3);
    expect(snapshot.notes).toEqual([
      {
        id: "note-1",
        title: "cipher-2",
        body: "body",
        created_at: "2026-01-01T00:00:00.000Z",
      },
    ]);
    expect(snapshot.canUndo).toBe(true);
    expect(snapshot.canRedo).toBe(false);
  });
});
