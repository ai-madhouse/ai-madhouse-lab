import { beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";

import { NextRequest } from "next/server";

import { encodeSessionCookie } from "@/lib/auth";
import {
  apiUnauthorizedErrorSchema,
  dashboardMetricsResponseSchema,
  livePulseSnapshotResponseSchema,
  sessionsChangedSuccessResponseSchema,
} from "@/lib/schemas/internal-api";
import {
  createSession,
  listSessionsForUser,
  type SessionRecord,
} from "@/lib/sessions";

let csrfValid = true;

let dashboardMetricsGet: typeof import("@/app/api/dashboard/metrics/route").GET;
let pulseSnapshotGet: typeof import("@/app/api/pulse/snapshot/route").GET;
let revokeOthersPost: typeof import("@/app/api/sessions/revoke-others/route").POST;
let signOutEverywherePost: typeof import("@/app/api/sessions/signout-everywhere/route").POST;

let username = "";
let currentSession: SessionRecord | null = null;
let authCookie = "";

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

describe("internal API contracts: runtime foundation routes", () => {
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
    ({ POST: revokeOthersPost } = await import(
      "@/app/api/sessions/revoke-others/route"
    ));
    ({ POST: signOutEverywherePost } = await import(
      "@/app/api/sessions/signout-everywhere/route"
    ));
  });

  beforeEach(async () => {
    csrfValid = true;
    username = `runtime-contract-${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
    currentSession = await createSession({ username });
    authCookie = encodeSessionCookie(currentSession.id);
  });

  test("/api/dashboard/metrics + /api/pulse/snapshot unauthorized contracts", async () => {
    const metricsRes = await dashboardMetricsGet(
      new NextRequest("http://local.test/api/dashboard/metrics"),
    );
    expect(metricsRes.status).toBe(401);
    expect(apiUnauthorizedErrorSchema.parse(await metricsRes.json())).toEqual({
      ok: false,
      error: "unauthorized",
    });

    const pulseRes = await pulseSnapshotGet(
      new NextRequest("http://local.test/api/pulse/snapshot"),
    );
    expect(pulseRes.status).toBe(401);
    expect(apiUnauthorizedErrorSchema.parse(await pulseRes.json())).toEqual({
      ok: false,
      error: "unauthorized",
    });
  });

  test("/api/dashboard/metrics + /api/pulse/snapshot success contracts", async () => {
    const metricsRes = await dashboardMetricsGet(
      createAuthedRequest("http://local.test/api/dashboard/metrics"),
    );
    expect(metricsRes.status).toBe(200);
    const metricsJson = dashboardMetricsResponseSchema.parse(
      await metricsRes.json(),
    );
    expect(metricsJson.ok).toBe(true);
    expect(metricsJson.metrics.activeSessions).toBeGreaterThanOrEqual(1);

    const pulseRes = await pulseSnapshotGet(
      createAuthedRequest("http://local.test/api/pulse/snapshot"),
    );
    expect(pulseRes.status).toBe(200);
    const pulseJson = livePulseSnapshotResponseSchema.parse(
      await pulseRes.json(),
    );
    expect(pulseJson.ok).toBe(true);
    expect(pulseJson.pulse.ts).toBeGreaterThan(0);
  });

  test("/api/sessions/revoke-others and /api/sessions/signout-everywhere contracts", async () => {
    const unauthorized = await revokeOthersPost(
      new NextRequest("http://local.test/api/sessions/revoke-others", {
        method: "POST",
      }),
    );
    expect(unauthorized.status).toBe(401);
    expect(apiUnauthorizedErrorSchema.parse(await unauthorized.json())).toEqual(
      {
        ok: false,
        error: "unauthorized",
      },
    );

    csrfValid = false;
    const csrfErr = await revokeOthersPost(
      createAuthedRequest("http://local.test/api/sessions/revoke-others", {
        method: "POST",
        headers: {
          "x-csrf-token": "bad-token",
        },
      }),
    );
    expect(csrfErr.status).toBe(403);
    expect(await csrfErr.json()).toEqual({ ok: false, error: "csrf" });

    csrfValid = true;
    await createSession({ username });
    const success = await revokeOthersPost(
      createAuthedRequest("http://local.test/api/sessions/revoke-others", {
        method: "POST",
        headers: {
          "x-csrf-token": "csrf-test-token",
        },
      }),
    );
    expect(success.status).toBe(200);
    expect(
      sessionsChangedSuccessResponseSchema.parse(await success.json()),
    ).toEqual({ ok: true });

    const sessionsAfterRevoke = await listSessionsForUser(username);
    expect(sessionsAfterRevoke).toHaveLength(1);
    expect(sessionsAfterRevoke[0]?.id).toBe(currentSession?.id);

    csrfValid = false;
    const signoutCsrfErr = await signOutEverywherePost(
      createAuthedRequest("http://local.test/api/sessions/signout-everywhere", {
        method: "POST",
        headers: {
          "x-csrf-token": "bad-token",
        },
      }),
    );
    expect(signoutCsrfErr.status).toBe(403);
    expect(await signoutCsrfErr.json()).toEqual({ ok: false, error: "csrf" });
  });
});
