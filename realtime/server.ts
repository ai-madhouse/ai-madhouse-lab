import crypto from "node:crypto";

import { createClient } from "@libsql/client";

import {
  authCookieName,
  decodeAndVerifySessionCookie,
  getCookieValue,
} from "./auth";
import { DB_PATH, REALTIME_PORT, REALTIME_SECRET } from "./config";
import { getRealtimeMetrics } from "./metrics";
import {
  countRealtimeConnections,
  ensureRealtimeConnectionsTable,
  pruneRealtimeConnections,
  touchRealtimeConnection,
} from "./realtime-connections";
import { json } from "./responses";
import { startSessionChecker } from "./session-checker";
import { getSession } from "./sessions";
import { addSocket, broadcast, removeSocket, socketsByUser } from "./sockets";
import type { PublishBody, WsData } from "./types";

const db = createClient({ url: `file:${DB_PATH}` });

// Best-effort: make sure the tracking table exists.
void ensureRealtimeConnectionsTable(db).catch(() => null);

const sessionCheckIntervalMs = 30_000;
const connectionStaleSeconds = Math.ceil((sessionCheckIntervalMs / 1000) * 4);

startSessionChecker({
  socketsByUser,
  getSession,
  intervalMs: sessionCheckIntervalMs,
});

let sweepRunning = false;
setInterval(() => {
  if (sweepRunning) return;
  sweepRunning = true;

  void (async () => {
    try {
      // Best-effort: refresh last_seen for active sockets.
      for (const set of socketsByUser.values()) {
        for (const ws of set) {
          try {
            await touchRealtimeConnection(db, ws.data.connectionId);
          } catch {
            // ignore
          }
        }
      }

      await pruneRealtimeConnections(db, connectionStaleSeconds);
    } finally {
      sweepRunning = false;
    }
  })();
}, sessionCheckIntervalMs);

function randomConnectionId() {
  return crypto.randomBytes(24).toString("base64url");
}

Bun.serve<WsData>({
  port: REALTIME_PORT,
  fetch: async (req, server) => {
    const url = new URL(req.url);

    if (url.pathname === "/health") {
      const local = getRealtimeMetrics(socketsByUser);

      const dbStats = await countRealtimeConnections(
        db,
        connectionStaleSeconds,
      ).catch(() => null);

      // Prefer the higher number to handle multi-process / load-balanced health checks.
      const connectionsTotal = Math.max(
        local.connectionsTotal,
        dbStats?.connectionsTotal ?? 0,
      );
      const usersConnected = Math.max(
        local.usersConnected,
        dbStats?.usersConnected ?? 0,
      );

      return json(200, { ok: true, connectionsTotal, usersConnected });
    }

    if (url.pathname === "/ws") {
      const cookieHeader = req.headers.get("cookie");
      const cookieValue = getCookieValue(cookieHeader, authCookieName);
      const sessionId = decodeAndVerifySessionCookie(cookieValue);
      if (!sessionId) return json(401, { ok: false, error: "unauthorized" });

      const session = await getSession(sessionId);
      if (!session) return json(401, { ok: false, error: "unauthorized" });

      const upgraded = server.upgrade(req, {
        data: {
          username: session.username,
          sessionId,
          connectionId: randomConnectionId(),
        },
      });

      return upgraded
        ? new Response(null, { status: 101 })
        : json(400, { ok: false, error: "upgrade failed" });
    }

    if (url.pathname === "/publish" && req.method === "POST") {
      const secret = req.headers.get("x-realtime-secret") ?? "";
      if (!secret || secret !== REALTIME_SECRET) {
        return json(401, { ok: false, error: "unauthorized" });
      }

      const body = (await req.json().catch(() => null)) as PublishBody | null;
      if (!body?.username)
        return json(400, { ok: false, error: "username required" });

      broadcast(body.username, body.event);
      return json(200, { ok: true });
    }

    return json(404, { ok: false, error: "not found" });
  },
  websocket: {
    open: (ws) => {
      addSocket(ws.data.username, ws);
      void touchRealtimeConnection(db, ws.data.connectionId).catch(() => null);
      ws.send(JSON.stringify({ type: "hello" }));
    },
    close: (ws) => {
      removeSocket(ws.data.username, ws);
      void touchRealtimeConnection(db, ws.data.connectionId).catch(() => null);
    },
    message: (_ws, _msg) => {
      // no-op (client is read-only)
    },
  },
});

console.log(`[realtime] listening on :${REALTIME_PORT} db=${DB_PATH}`);
