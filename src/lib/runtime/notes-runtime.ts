"use client";

import { decryptJson } from "@/lib/crypto/webcrypto";
import {
  applyNotesEvents,
  type NoteSnapshot,
  type NotesEvent,
  type NotesEventKind,
} from "@/lib/notes-e2ee/model";
import { subscribeRealtimeWs } from "@/lib/runtime/ws-client";
import {
  notesHistoryGetSuccessResponseSchema,
  notesHistoryPostSuccessResponseSchema,
} from "@/lib/schemas/internal-api";

export type NotesHistoryRow = {
  id: string;
  username: string;
  created_at: string;
  kind: NotesEventKind;
  note_id: string;
  target_event_id: string | null;
  payload_iv: string | null;
  payload_ciphertext: string | null;
};

export type NotesRuntimeSnapshot = {
  events: NotesEvent[];
  notes: NoteSnapshot[];
  canUndo: boolean;
  canRedo: boolean;
  undoTargetEventId: string | null;
  redoTargetEventId: string | null;
};

function readErrorCode(payload: unknown, fallback: string) {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error;
  }

  return fallback;
}

export async function fetchNotesHistory() {
  const response = await fetch("/api/notes-history", { cache: "no-store" });
  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw new Error(readErrorCode(payload, "history_failed"));
  }

  const parsed = notesHistoryGetSuccessResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error("invalid_history_response");
  }

  return parsed.data.events;
}

export async function postNotesHistoryEvent({
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
  const response = await fetch("/api/notes-history", {
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

  const responseBody = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw new Error(readErrorCode(responseBody, "write_event_failed"));
  }

  const parsed = notesHistoryPostSuccessResponseSchema.safeParse(responseBody);
  if (!parsed.success) {
    throw new Error("invalid_write_response");
  }

  return parsed.data.id;
}

const encryptedHistoryKinds = new Set<NotesEventKind>(["create", "update"]);

function isEncryptedHistoryRow(row: NotesHistoryRow): row is NotesHistoryRow & {
  payload_iv: string;
  payload_ciphertext: string;
} {
  return (
    encryptedHistoryKinds.has(row.kind) &&
    Boolean(row.payload_iv) &&
    Boolean(row.payload_ciphertext)
  );
}

export async function decryptNotesHistory({
  key,
  history,
  decrypt = decryptJson,
}: {
  key: CryptoKey;
  history: NotesHistoryRow[];
  decrypt?: typeof decryptJson;
}) {
  const events: NotesEvent[] = [];

  for (const row of history) {
    const event: NotesEvent = {
      id: row.id,
      created_at: row.created_at,
      kind: row.kind,
      note_id: row.note_id,
      target_event_id: row.target_event_id,
      payload_iv: row.payload_iv,
      payload_ciphertext: row.payload_ciphertext,
    };

    if (isEncryptedHistoryRow(row)) {
      try {
        event.note = await decrypt<NoteSnapshot>({
          key,
          payload_iv: row.payload_iv,
          payload_ciphertext: row.payload_ciphertext,
        });
      } catch {
        // Ignore malformed encrypted payloads so valid events still render.
      }
    }

    events.push(event);
  }

  const nextState = applyNotesEvents(events);
  return {
    events,
    notes: nextState.notes,
    canUndo: nextState.canUndo,
    canRedo: nextState.canRedo,
    undoTargetEventId: nextState.undoTargetEventId,
    redoTargetEventId: nextState.redoTargetEventId,
  } satisfies NotesRuntimeSnapshot;
}

export async function fetchNotesRuntimeSnapshot(key: CryptoKey) {
  const history = await fetchNotesHistory();
  return decryptNotesHistory({ key, history });
}

/**
 * Subscribe notes runtime to both same-origin SSE and realtime websocket events.
 */
export function subscribeNotesRuntime(onNotesChanged: () => void) {
  const eventStream = new EventSource("/api/notes-stream");

  const onStreamChanged = () => {
    onNotesChanged();
  };

  eventStream.addEventListener("notes:changed", onStreamChanged);

  const unsubscribeWs = subscribeRealtimeWs({
    onEvent: (event) => {
      if (event.type === "notes:changed") {
        onNotesChanged();
      }
    },
    onStatus: () => {
      // Notes runtime doesn't render ws status directly.
    },
  });

  return () => {
    eventStream.removeEventListener("notes:changed", onStreamChanged);
    eventStream.close();
    unsubscribeWs();
  };
}
