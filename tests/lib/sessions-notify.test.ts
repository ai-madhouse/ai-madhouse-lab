import { describe, expect, test } from "bun:test";
import {
  notifySessionsChanged,
  revokeSessionAndNotify,
  sessionsChangedEvent,
} from "@/lib/sessions-notify";

describe("sessions-notify", () => {
  test("sessionsChangedEvent returns stable payload", () => {
    expect(sessionsChangedEvent()).toEqual({ type: "sessions:changed" });
  });

  test("notifySessionsChanged publishes sessions:changed", async () => {
    const calls: unknown[] = [];

    await notifySessionsChanged({
      username: "alice",
      deps: {
        publishRealtimeEvent: async (args) => {
          calls.push(args);
        },
      },
    });

    expect(calls).toEqual([
      { username: "alice", event: { type: "sessions:changed" } },
    ]);
  });

  test("revokeSessionAndNotify deletes session then publishes sessions:changed", async () => {
    const calls: string[] = [];

    await revokeSessionAndNotify({
      username: "alice",
      sessionId: "session-123",
      deps: {
        deleteSession: async (sessionId) => {
          calls.push(`delete:${sessionId}`);
        },
        publishRealtimeEvent: async ({ username, event }) => {
          const type =
            typeof event === "object" && event && "type" in event
              ? String((event as { type: unknown }).type)
              : "unknown";
          calls.push(`publish:${username}:${type}`);
        },
      },
    });

    expect(calls).toEqual([
      "delete:session-123",
      "publish:alice:sessions:changed",
    ]);
  });
});
