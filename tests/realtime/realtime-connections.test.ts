import { describe, expect, test } from "bun:test";
import os from "node:os";
import path from "node:path";

import { createClient } from "@libsql/client";

import {
  countRealtimeConnections,
  ensureRealtimeConnectionsTable,
  pruneRealtimeConnections,
  registerRealtimeConnection,
  touchRealtimeConnection,
  unregisterRealtimeConnection,
} from "../../realtime/realtime-connections";

describe("realtime connection metrics", () => {
  test("counts total connections and distinct users", async () => {
    const dbPath = path.join(
      os.tmpdir(),
      `ai-madhouse-lab-realtime-connections-${Date.now()}.db`,
    );
    const db = createClient({ url: `file:${dbPath}` });

    await ensureRealtimeConnectionsTable(db);

    await registerRealtimeConnection(db, { id: "c1", username: "alice" });
    await registerRealtimeConnection(db, { id: "c2", username: "alice" });
    await registerRealtimeConnection(db, { id: "c3", username: "bob" });

    const stats = await countRealtimeConnections(db, 120);

    expect(stats).toEqual({ connectionsTotal: 3, usersConnected: 2 });
  });

  test("deduplicates concurrent register calls for the same connection identity", async () => {
    const dbPath = path.join(
      os.tmpdir(),
      `ai-madhouse-lab-realtime-dedup-${Date.now()}.db`,
    );
    const db = createClient({ url: `file:${dbPath}` });

    await ensureRealtimeConnectionsTable(db);

    await Promise.all([
      registerRealtimeConnection(db, { id: "session-1", username: "alice" }),
      registerRealtimeConnection(db, { id: "session-1", username: "alice" }),
    ]);
    await registerRealtimeConnection(db, { id: "session-2", username: "bob" });

    expect(await countRealtimeConnections(db, 120)).toEqual({
      connectionsTotal: 2,
      usersConnected: 2,
    });
  });

  test("touch keeps connections fresh; prune removes stale rows", async () => {
    const dbPath = path.join(
      os.tmpdir(),
      `ai-madhouse-lab-realtime-stale-${Date.now()}.db`,
    );
    const db = createClient({ url: `file:${dbPath}` });

    await ensureRealtimeConnectionsTable(db);

    await registerRealtimeConnection(db, { id: "c1", username: "alice" });
    await registerRealtimeConnection(db, { id: "c2", username: "bob" });

    // Mark c1 as stale; keep c2 fresh.
    await db.execute(
      "update realtime_connections set last_seen_at = datetime('now', '-999 seconds') where id = 'c1'",
    );

    expect(await countRealtimeConnections(db, 120)).toEqual({
      connectionsTotal: 1,
      usersConnected: 1,
    });

    await touchRealtimeConnection(db, "c1");

    expect(await countRealtimeConnections(db, 120)).toEqual({
      connectionsTotal: 2,
      usersConnected: 2,
    });

    // Stale again; then prune.
    await db.execute(
      "update realtime_connections set last_seen_at = datetime('now', '-999 seconds') where id = 'c1'",
    );

    await pruneRealtimeConnections(db, 120);

    expect(await countRealtimeConnections(db, 120)).toEqual({
      connectionsTotal: 1,
      usersConnected: 1,
    });
  });

  test("unregister removes connection rows", async () => {
    const dbPath = path.join(
      os.tmpdir(),
      `ai-madhouse-lab-realtime-unregister-${Date.now()}.db`,
    );
    const db = createClient({ url: `file:${dbPath}` });

    await ensureRealtimeConnectionsTable(db);

    await registerRealtimeConnection(db, { id: "c1", username: "alice" });
    await registerRealtimeConnection(db, { id: "c2", username: "bob" });

    expect(await countRealtimeConnections(db, 120)).toEqual({
      connectionsTotal: 2,
      usersConnected: 2,
    });

    await unregisterRealtimeConnection(db, "c2");

    expect(await countRealtimeConnections(db, 120)).toEqual({
      connectionsTotal: 1,
      usersConnected: 1,
    });
  });
});
