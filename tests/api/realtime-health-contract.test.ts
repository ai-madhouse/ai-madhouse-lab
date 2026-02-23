import { beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";

import { NextRequest } from "next/server";

import { encodeSessionCookie } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { realtimeHealthSuccessResponseSchema } from "@/lib/schemas/internal-api";
import { createSession } from "@/lib/sessions";

let realtimeHealthGet: typeof import("@/app/api/realtime/health/route").GET;
let authCookie = "";
let username = "";

function createAuthedRequest(url: string) {
  return new NextRequest(url, {
    headers: {
      cookie: `madhouse_auth=${authCookie}`,
    },
  });
}

describe("internal API contracts: /api/realtime/health", () => {
  beforeAll(async () => {
    ({ GET: realtimeHealthGet } = await import(
      "@/app/api/realtime/health/route"
    ));
  });

  beforeEach(async () => {
    username = `realtime-health-${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
    const session = await createSession({ username });
    authCookie = encodeSessionCookie(session.id);
  });

  test("unauthorized contract", async () => {
    const res = await realtimeHealthGet(
      new NextRequest("http://local.test/api/realtime/health"),
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ ok: false, error: "unauthorized" });
  });

  test("success contract returns realtime connection totals", async () => {
    const db = await getDb();
    await db.execute({
      sql: "insert into realtime_connections(id, username, connected_at, last_seen_at) values(?, ?, datetime('now'), datetime('now'))",
      args: [randomUUID(), username],
    });

    const res = await realtimeHealthGet(
      createAuthedRequest("http://local.test/api/realtime/health"),
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      ok: true;
      connectionsTotal: number;
      usersConnected: number;
    };
    expect(json.ok).toBe(true);
    expect(json.connectionsTotal).toBeGreaterThanOrEqual(1);
    expect(json.usersConnected).toBeGreaterThanOrEqual(1);
  });

  test("contract treats explicit zero totals as valid and omitted totals as invalid", () => {
    const zeroCounts = realtimeHealthSuccessResponseSchema.safeParse({
      ok: true,
      connectionsTotal: 0,
      usersConnected: 0,
    });
    const missingCounts = realtimeHealthSuccessResponseSchema.safeParse({
      ok: true,
    });

    expect(zeroCounts.success).toBe(true);
    expect(missingCounts.success).toBe(false);
  });

  test("success contract keeps realtime totals DB-backed when runtime reports drifted values", async () => {
    const db = await getDb();
    await db.execute({
      sql: "insert into realtime_connections(id, username, connected_at, last_seen_at) values(?, ?, datetime('now'), datetime('now'))",
      args: [randomUUID(), username],
    });
    const expectedRes = await db.execute({
      sql: "select count(*) as connectionsTotal, count(distinct username) as usersConnected from realtime_connections where last_seen_at >= datetime('now', '-120 seconds')",
    });
    const expectedRow = expectedRes.rows[0] as
      | {
          connectionsTotal?: number | string | null;
          usersConnected?: number | string | null;
        }
      | undefined;
    const expectedConnectionsTotal = Number(expectedRow?.connectionsTotal ?? 0);
    const expectedUsersConnected = Number(expectedRow?.usersConnected ?? 0);

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (
      input: string | URL | Request,
      init?: RequestInit,
    ) => {
      if (typeof input === "string" && input.endsWith("/health")) {
        return new Response(
          JSON.stringify({
            ok: true,
            connectionsTotal: 777,
            usersConnected: 333,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      return originalFetch(input as never, init);
    }) as typeof globalThis.fetch;

    try {
      const res = await realtimeHealthGet(
        createAuthedRequest("http://local.test/api/realtime/health"),
      );

      expect(res.status).toBe(200);
      const json = (await res.json()) as {
        ok: true;
        connectionsTotal: number;
        usersConnected: number;
      };
      expect(json.ok).toBe(true);
      expect(json.connectionsTotal).toBe(expectedConnectionsTotal);
      expect(json.usersConnected).toBe(expectedUsersConnected);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
