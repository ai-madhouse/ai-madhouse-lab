import {
  authCookieName,
  decodeAndVerifySessionCookie,
  getCookieValue,
} from "./auth";
import { DB_PATH, REALTIME_PORT, REALTIME_SECRET } from "./config";
import { getRealtimeMetrics } from "./metrics";
import { json } from "./responses";
import { startSessionChecker } from "./session-checker";
import { getSession } from "./sessions";
import { addSocket, broadcast, removeSocket, socketsByUser } from "./sockets";
import type { PublishBody, WsData } from "./types";

startSessionChecker({ socketsByUser, getSession });

Bun.serve<WsData>({
  port: REALTIME_PORT,
  fetch: async (req, server) => {
    const url = new URL(req.url);

    if (url.pathname === "/health") {
      // Minimal introspection for dashboards.
      return json(200, { ok: true, ...getRealtimeMetrics(socketsByUser) });
    }

    if (url.pathname === "/ws") {
      const cookieHeader = req.headers.get("cookie");
      const cookieValue = getCookieValue(cookieHeader, authCookieName);
      const sessionId = decodeAndVerifySessionCookie(cookieValue);
      if (!sessionId) return json(401, { ok: false, error: "unauthorized" });

      const session = await getSession(sessionId);
      if (!session) return json(401, { ok: false, error: "unauthorized" });

      const upgraded = server.upgrade(req, {
        data: { username: session.username, sessionId },
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
      ws.send(JSON.stringify({ type: "hello" }));
    },
    close: (ws) => {
      removeSocket(ws.data.username, ws);
    },
    message: (_ws, _msg) => {
      // no-op (client is read-only)
    },
  },
});

console.log(`[realtime] listening on :${REALTIME_PORT} db=${DB_PATH}`);
