import { beforeEach, describe, expect, test } from "bun:test";

import { NextRequest } from "next/server";

import { GET as sessionMeGet } from "@/app/api/session/me/route";
import { encodeSessionCookie } from "@/lib/auth";
import {
  apiUnauthorizedErrorSchema,
  csrfEndpointResponseSchema,
  sessionMeSuccessResponseSchema,
} from "@/lib/schemas/internal-api";
import { createSession } from "@/lib/sessions";

let authCookie = "";

function createAuthedRequest(url: string, ip = "203.0.113.10") {
  return new NextRequest(url, {
    headers: {
      cookie: `madhouse_auth=${authCookie}`,
      "x-forwarded-for": `${ip}, 203.0.113.11`,
    },
  });
}

describe("internal API contracts: /api/session/me + csrf contract schema", () => {
  beforeEach(async () => {
    const username = `session-contract-${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
    const session = await createSession({ username });
    authCookie = encodeSessionCookie(session.id);
  });

  test("/api/session/me unauthorized contract", async () => {
    const res = await sessionMeGet(
      new NextRequest("http://local.test/api/session/me"),
    );

    expect(res.status).toBe(401);
    expect(apiUnauthorizedErrorSchema.parse(await res.json())).toEqual({
      ok: false,
      error: "unauthorized",
    });
  });

  test("/api/session/me success contract", async () => {
    const res = await sessionMeGet(
      createAuthedRequest("http://local.test/api/session/me"),
    );

    expect(res.status).toBe(200);
    expect(sessionMeSuccessResponseSchema.parse(await res.json())).toEqual({
      ok: true,
      sessionId: expect.any(String),
      ip: "203.0.113.10",
    });
  });

  test("csrf endpoint schema contract remains explicit", () => {
    expect(
      csrfEndpointResponseSchema.parse({ ok: true, token: "csrf-test-token" }),
    ).toEqual({
      ok: true,
      token: "csrf-test-token",
    });
  });
});
