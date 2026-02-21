import { describe, expect, test } from "bun:test";

import {
  isPulseErrorState,
  isPulseSuccessState,
  type PulsePayload,
} from "@/lib/live/pulse-state";

describe("isPulseErrorState", () => {
  test("returns false for initial empty state", () => {
    expect(isPulseErrorState(null)).toBe(false);
  });

  test("returns false for valid pulse payload", () => {
    const payload: PulsePayload = {
      ts: Date.now(),
      activeSessions: 1,
      notesCount: 2,
      notesEventsLastHour: 3,
      notesEventsLastDay: 4,
      lastNotesActivityAt: null,
      realtime: { ok: true, connectionsTotal: 1, usersConnected: 1 },
    };

    expect(isPulseErrorState(payload)).toBe(false);
  });

  test("returns true for stream error payload", () => {
    const payload: PulsePayload = {
      ts: Date.now(),
      error: "stream disconnected",
    };

    expect(isPulseErrorState(payload)).toBe(true);
    expect(isPulseSuccessState(payload)).toBe(false);
  });

  test("returns true for success payload", () => {
    const payload: PulsePayload = {
      ts: Date.now(),
      activeSessions: 1,
      notesCount: 2,
      notesEventsLastHour: 3,
      notesEventsLastDay: 4,
      lastNotesActivityAt: null,
      realtime: { ok: true },
    };

    expect(isPulseSuccessState(payload)).toBe(true);
  });
});
