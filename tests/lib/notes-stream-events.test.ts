import { describe, expect, test } from "bun:test";

import { buildNotesStreamTickResult } from "@/lib/notes-stream-events";

describe("notes-stream-events", () => {
  test("emits ping and keeps last id when latest id has not advanced", () => {
    const result = buildNotesStreamTickResult({
      lastId: "evt-1",
      latestId: "evt-1",
      now: () => 1_700_000_000_000,
    });

    expect(result).toEqual({
      nextLastId: "evt-1",
      payload: {
        event: "ping",
        data: { ts: 1_700_000_000_000 },
      },
    });
  });

  test("emits notes:changed and advances last id when latest id changes", () => {
    const result = buildNotesStreamTickResult({
      lastId: "evt-1",
      latestId: "evt-2",
      now: () => 0,
    });

    expect(result).toEqual({
      nextLastId: "evt-2",
      payload: {
        event: "notes:changed",
        data: { id: "evt-2" },
      },
    });
  });

  test("emits ping when there is still no latest id", () => {
    const result = buildNotesStreamTickResult({
      lastId: null,
      latestId: null,
      now: () => 42,
    });

    expect(result).toEqual({
      nextLastId: null,
      payload: {
        event: "ping",
        data: { ts: 42 },
      },
    });
  });
});
