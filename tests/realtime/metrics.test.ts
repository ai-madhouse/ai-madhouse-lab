import { describe, expect, test } from "bun:test";

import { getRealtimeMetrics } from "../../realtime/metrics";
import { hasSocketForSession } from "../../realtime/sockets";
import type { Ws } from "../../realtime/types";

function makeSocket(username: string, sessionId: string): Ws {
  return {
    data: {
      username,
      sessionId,
      connectionId: sessionId,
    },
    close: () => undefined,
    send: () => undefined,
  } as unknown as Ws;
}

describe("realtime metrics/session dedup", () => {
  test("counts unique active sessions per user instead of raw sockets", () => {
    const socketsByUser = new Map<string, Set<Ws>>();
    socketsByUser.set("alice", new Set([makeSocket("alice", "s1")]));
    // Simulate duplicate socket instances for the same logical session.
    socketsByUser.get("alice")?.add(makeSocket("alice", "s1"));
    socketsByUser.get("alice")?.add(makeSocket("alice", "s2"));
    socketsByUser.set("bob", new Set([makeSocket("bob", "s3")]));

    expect(getRealtimeMetrics(socketsByUser)).toEqual({
      connectionsTotal: 3,
      usersConnected: 2,
    });
  });

  test("detects whether any socket remains for a session identity", () => {
    const socketsByUser = new Map<string, Set<Ws>>();
    socketsByUser.set("alice", new Set([makeSocket("alice", "s1")]));

    expect(hasSocketForSession(socketsByUser, "alice", "s1")).toBe(true);
    expect(hasSocketForSession(socketsByUser, "alice", "missing")).toBe(false);
    expect(hasSocketForSession(socketsByUser, "bob", "s1")).toBe(false);
  });
});
