import { beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";
import { randomUUID } from "node:crypto";

import { NextRequest } from "next/server";

import { encodeSessionCookie } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { createSession, listSessionsForUser } from "@/lib/sessions";
import { createUser, verifyCredentials } from "@/lib/users";

let csrfValid = true;
let authCookie = "";
let username = "";

let dashboardMetricsGet: typeof import("@/app/api/dashboard/metrics/route").GET;
let pulseSnapshotGet: typeof import("@/app/api/pulse/snapshot/route").GET;
let revokeOtherSessionsPost: typeof import("@/app/api/sessions/revoke-others/route").POST;
let changePasswordPost: typeof import("@/app/api/settings/change-password/route").POST;

function createAuthedRequest(
  url: string,
  init?: ConstructorParameters<typeof NextRequest>[1],
) {
  const headers = new Headers(init?.headers);
  headers.set(
    "cookie",
    `madhouse_auth=${authCookie}; madhouse_csrf=csrf-test-token`,
  );
  return new NextRequest(url, { ...init, headers });
}

describe("phase3 runtime route contracts", () => {
  beforeAll(async () => {
    mock.module("@/lib/csrf", () => ({
      verifyCsrfToken: async () => csrfValid,
      csrfCookieName: "madhouse_csrf",
      generateCsrfToken: () => "csrf-test-token",
    }));

    ({ GET: dashboardMetricsGet } = await import(
      "@/app/api/dashboard/metrics/route"
    ));
    ({ GET: pulseSnapshotGet } = await import(
      "@/app/api/pulse/snapshot/route"
    ));
    ({ POST: revokeOtherSessionsPost } = await import(
      "@/app/api/sessions/revoke-others/route"
    ));
    ({ POST: changePasswordPost } = await import(
      "@/app/api/settings/change-password/route"
    ));
  });

  beforeEach(async () => {
    csrfValid = true;
    username = `phase3-${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
    await createUser({ username, password: "StrongPassword123!" });
    const session = await createSession({ username });
    authCookie = encodeSessionCookie(session.id);
  });

  test("/api/dashboard/metrics + /api/pulse/snapshot unauthorized contracts", async () => {
    const metricsRes = await dashboardMetricsGet(
      new NextRequest("http://local.test/api/dashboard/metrics"),
    );
    expect(metricsRes.status).toBe(401);
    expect(await metricsRes.json()).toEqual({
      ok: false,
      error: "unauthorized",
    });

    const pulseRes = await pulseSnapshotGet(
      new NextRequest("http://local.test/api/pulse/snapshot"),
    );
    expect(pulseRes.status).toBe(401);
    expect(await pulseRes.json()).toEqual({ ok: false, error: "unauthorized" });
  });

  test("/api/dashboard/metrics + /api/pulse/snapshot success contracts", async () => {
    const db = await getDb();
    await db.execute({
      sql: "insert into realtime_connections(id, username, connected_at, last_seen_at) values(?, ?, datetime('now'), datetime('now'))",
      args: [randomUUID(), username],
    });

    const metricsRes = await dashboardMetricsGet(
      createAuthedRequest("http://local.test/api/dashboard/metrics"),
    );
    expect(metricsRes.status).toBe(200);
    const metricsJson = (await metricsRes.json()) as {
      ok: true;
      metrics: {
        activeSessions: number;
        notesCount: number;
        notesEventsLastHour: number;
        notesEventsLastDay: number;
        lastNotesActivityAt: string | null;
        realtime: {
          ok: true;
          usersConnected?: number;
          connectionsTotal?: number;
        } | null;
      };
    };
    expect(metricsJson.ok).toBe(true);
    expect(typeof metricsJson.metrics.activeSessions).toBe("number");
    expect(metricsJson.metrics.realtime?.ok).toBe(true);
    expect((metricsJson.metrics.realtime?.usersConnected ?? 0) >= 1).toBe(true);
    expect((metricsJson.metrics.realtime?.connectionsTotal ?? 0) >= 1).toBe(
      true,
    );

    const pulseRes = await pulseSnapshotGet(
      createAuthedRequest("http://local.test/api/pulse/snapshot"),
    );
    expect(pulseRes.status).toBe(200);
    const pulseJson = (await pulseRes.json()) as {
      ok: true;
      pulse: {
        ts: number;
        activeSessions: number;
        notesCount: number;
      };
    };
    expect(pulseJson.ok).toBe(true);
    expect(typeof pulseJson.pulse.ts).toBe("number");
    expect(typeof pulseJson.pulse.activeSessions).toBe("number");
  });

  test("/api/sessions/revoke-others revokes secondary sessions", async () => {
    await createSession({ username });

    const before = await listSessionsForUser(username);
    expect(before.length).toBeGreaterThanOrEqual(2);

    const res = await revokeOtherSessionsPost(
      createAuthedRequest("http://local.test/api/sessions/revoke-others", {
        method: "POST",
        headers: {
          "x-csrf-token": "csrf-test-token",
        },
      }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    const after = await listSessionsForUser(username);
    expect(after).toHaveLength(1);
  });

  test("/api/settings/change-password validates and updates credentials", async () => {
    csrfValid = false;
    const csrfErr = await changePasswordPost(
      createAuthedRequest("http://local.test/api/settings/change-password", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          csrfToken: "bad",
          currentPassword: "StrongPassword123!",
          newPassword: "AnotherPassword123!",
          newPassword2: "AnotherPassword123!",
        }),
      }),
    );

    expect(csrfErr.status).toBe(403);
    expect(await csrfErr.json()).toEqual({ ok: false, error: "csrf" });

    csrfValid = true;
    const success = await changePasswordPost(
      createAuthedRequest("http://local.test/api/settings/change-password", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          csrfToken: "ok",
          currentPassword: "StrongPassword123!",
          newPassword: "AnotherPassword123!",
          newPassword2: "AnotherPassword123!",
        }),
      }),
    );

    expect(success.status).toBe(200);
    expect(await success.json()).toEqual({ ok: true });

    expect(
      await verifyCredentials({ username, password: "AnotherPassword123!" }),
    ).toBe(true);
  });
});
