export type NotesStreamHeartbeatEvent = {
  event: "ping";
  data: { ts: number };
};

export type NotesStreamChangedEvent = {
  event: "notes:changed";
  data: { id: string };
};

export type NotesStreamTickResult = {
  nextLastId: string | null;
  payload: NotesStreamHeartbeatEvent | NotesStreamChangedEvent;
};

type BuildNotesStreamTickParams = {
  lastId: string | null;
  latestId: string | null;
  now?: () => number;
};

export function buildNotesStreamTickResult({
  lastId,
  latestId,
  now = Date.now,
}: BuildNotesStreamTickParams): NotesStreamTickResult {
  if (latestId && latestId !== lastId) {
    return {
      nextLastId: latestId,
      payload: {
        event: "notes:changed",
        data: { id: latestId },
      },
    };
  }

  return {
    nextLastId: lastId,
    payload: {
      event: "ping",
      data: { ts: now() },
    },
  };
}
