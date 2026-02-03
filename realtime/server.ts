import crypto from "node:crypto";
import { type Client, createClient } from "@libsql/client";
import type { ServerWebSocket } from "bun";

type SessionRow = {
  id: string;
  username: string;
  expires_at: string;
};

type PublishBody = {
  username: string;
  event: unknown;
};

function getEnv(name: string) {
  return process.env[name]?.trim() || "";
}

function getAuthSecret() {
  const secret = getEnv("AUTH_SECRET");
  if (secret && secret.length >= 16) return secret;

  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET must be set in production");
  }

  return "dev-secret-change-me-please";
}

function hmac(sessionId: string) {
  return crypto
    .createHmac("sha256", getAuthSecret())
    .update(sessionId)
    .digest("base64url");
}

function timingSafeEqualString(a: string, b: string) {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

function decodeAndVerifySessionCookie(value: string | undefined | null) {
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 2) return null;
  const [sessionId, sig] = parts;
  if (!sessionId || !sig) return null;
  const expected = hmac(sessionId);
  if (!timingSafeEqualString(sig, expected)) return null;
  return sessionId;
}

function getCookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return null;
}

const authCookieName = "madhouse_auth";

const REALTIME_PORT = Number(getEnv("REALTIME_PORT") || "8787");
const REALTIME_SECRET = getEnv("REALTIME_SECRET") || "dev-realtime-secret";
const DB_PATH = getEnv("DB_PATH") || "data/app.db";

const db: Client = createClient({ url: `file:${DB_PATH}` });

async function getSession(sessionId: string): Promise<SessionRow | null> {
  const res = await db.execute({
    sql: "select id, username, expires_at from sessions where id = ?",
    args: [sessionId],
  });

  const row = res.rows[0] as unknown as SessionRow | undefined;
  if (!row) return null;

  if (new Date(row.expires_at).getTime() <= Date.now()) {
    await db.execute({
      sql: "delete from sessions where id = ?",
      args: [sessionId],
    });
    return null;
  }

  return row;
}

type Ws = ServerWebSocket<{ username: string; sessionId: string }>;

const socketsByUser = new Map<string, Set<Ws>>();

const sessionCheckIntervalMs = 30_000;

setInterval(async () => {
  // Best-effort: close sockets whose session has been revoked/expired.
  for (const set of socketsByUser.values()) {
    for (const ws of set) {
      try {
        const session = await getSession(ws.data.sessionId);
        if (!session) {
          ws.close();
        }
      } catch {
        // ignore
      }
    }
  }
}, sessionCheckIntervalMs);

function addSocket(username: string, ws: Ws) {
  const set = socketsByUser.get(username) ?? new Set<Ws>();
  set.add(ws);
  socketsByUser.set(username, set);
}

function removeSocket(username: string, ws: Ws) {
  const set = socketsByUser.get(username);
  if (!set) return;
  set.delete(ws);
  if (set.size === 0) socketsByUser.delete(username);
}

function broadcast(username: string, payload: unknown) {
  const set = socketsByUser.get(username);
  if (!set) return;
  const message = JSON.stringify(payload);
  for (const ws of set) {
    try {
      ws.send(message);
    } catch {
      // ignore
    }
  }
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

Bun.serve<{ username: string; sessionId: string }>({
  port: REALTIME_PORT,
  fetch: async (req, server) => {
    const url = new URL(req.url);

    if (url.pathname === "/health") {
      return json(200, { ok: true });
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
