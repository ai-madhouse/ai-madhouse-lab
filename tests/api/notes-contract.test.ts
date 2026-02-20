import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  mock,
  test,
} from "bun:test";
import { randomUUID } from "node:crypto";

import { NextRequest } from "next/server";

import { encodeSessionCookie } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  apiUnauthorizedErrorSchema,
  notesHistoryGetSuccessResponseSchema,
  notesHistoryPostErrorResponseSchema,
  notesHistoryPostSuccessResponseSchema,
  notesStreamChangedEventSchema,
  notesStreamHelloEventSchema,
} from "@/lib/schemas/internal-api";
import { createSession } from "@/lib/sessions";

let csrfValid = true;

let notesHistoryGet: typeof import("@/app/api/notes-history/route").GET;
let notesHistoryPost: typeof import("@/app/api/notes-history/route").POST;
let notesStreamGet: typeof import("@/app/api/notes-stream/route").GET;

let username = "";
let authCookie = "";
let previousRealtimeDisabled: string | undefined;

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

async function readSseEvents(response: Response, take: number) {
  const reader = response.body?.getReader();
  if (!reader) return [];

  let buffer = "";
  const out: Array<{ event: string; data: unknown }> = [];

  while (out.length < take) {
    const read = await reader.read();
    if (read.done) break;

    buffer += new TextDecoder().decode(read.value, { stream: true });

    let idx = buffer.indexOf("\n\n");
    while (idx !== -1) {
      const block = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);

      const lines = block.split("\n");
      const eventLine = lines.find((line) => line.startsWith("event: "));
      const dataLine = lines.find((line) => line.startsWith("data: "));
      if (eventLine && dataLine) {
        out.push({
          event: eventLine.slice("event: ".length),
          data: JSON.parse(dataLine.slice("data: ".length)),
        });
      }

      if (out.length >= take) break;
      idx = buffer.indexOf("\n\n");
    }
  }

  return out;
}

describe("internal API contracts: /api/notes-history and /api/notes-stream", () => {
  beforeAll(async () => {
    mock.module("@/lib/csrf", () => ({
      verifyCsrfToken: async () => csrfValid,
      csrfCookieName: "madhouse_csrf",
      generateCsrfToken: () => "csrf-test-token",
    }));

    ({ GET: notesHistoryGet, POST: notesHistoryPost } = await import(
      "@/app/api/notes-history/route"
    ));
    ({ GET: notesStreamGet } = await import("@/app/api/notes-stream/route"));

    previousRealtimeDisabled = process.env.REALTIME_DISABLED;
    process.env.REALTIME_DISABLED = "1";
  });

  afterAll(() => {
    if (previousRealtimeDisabled === undefined)
      delete process.env.REALTIME_DISABLED;
    else process.env.REALTIME_DISABLED = previousRealtimeDisabled;
    mock.restore();
  });

  beforeEach(async () => {
    csrfValid = true;
    username = `notes-contract-${Date.now()}-${Math.floor(Math.random() * 10_000)}`;

    const session = await createSession({ username });
    authCookie = encodeSessionCookie(session.id);
  });

  test("/api/notes-history GET unauthorized contract", async () => {
    const res = await notesHistoryGet(
      new NextRequest("http://local.test/api/notes-history"),
    );
    expect(res.status).toBe(401);
    expect(apiUnauthorizedErrorSchema.parse(await res.json())).toEqual({
      ok: false,
      error: "unauthorized",
    });
  });

  test("/api/notes-history GET success contract", async () => {
    const db = await getDb();
    await db.execute({
      sql: "insert into notes_events(id, username, kind, note_id, target_event_id, payload_iv, payload_ciphertext) values(?,?,?,?,?,?,?)",
      args: [randomUUID(), username, "create", "note-1", null, "iv", "cipher"],
    });

    const res = await notesHistoryGet(
      createAuthedRequest("http://local.test/api/notes-history"),
    );
    expect(res.status).toBe(200);
    const json = notesHistoryGetSuccessResponseSchema.parse(await res.json());
    expect(json.events.length).toBeGreaterThan(0);
    expect(json.events.some((event) => event.username === username)).toBe(true);
  });

  test("/api/notes-history POST error contracts", async () => {
    const unauthorized = await notesHistoryPost(
      new NextRequest("http://local.test/api/notes-history", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "delete", note_id: "note-1" }),
      }),
    );
    expect(unauthorized.status).toBe(401);
    expect(
      notesHistoryPostErrorResponseSchema.parse(await unauthorized.json()),
    ).toEqual({
      ok: false,
      error: "unauthorized",
    });

    csrfValid = false;
    const csrfErr = await notesHistoryPost(
      createAuthedRequest("http://local.test/api/notes-history", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": "bad-token",
        },
        body: JSON.stringify({ kind: "delete", note_id: "note-1" }),
      }),
    );
    expect(csrfErr.status).toBe(403);
    expect(
      notesHistoryPostErrorResponseSchema.parse(await csrfErr.json()),
    ).toEqual({ ok: false, error: "csrf" });

    csrfValid = true;
    const invalidKindErr = await notesHistoryPost(
      createAuthedRequest("http://local.test/api/notes-history", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": "ok-token",
        },
        body: JSON.stringify({ kind: "bad-kind", note_id: "note-1" }),
      }),
    );
    expect(invalidKindErr.status).toBe(400);
    expect(
      notesHistoryPostErrorResponseSchema.parse(await invalidKindErr.json()),
    ).toEqual({ ok: false, error: "invalid kind" });

    const missingTargetErr = await notesHistoryPost(
      createAuthedRequest("http://local.test/api/notes-history", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": "ok-token",
        },
        body: JSON.stringify({ kind: "undo", note_id: "note-1" }),
      }),
    );
    expect(missingTargetErr.status).toBe(400);
    expect(
      notesHistoryPostErrorResponseSchema.parse(await missingTargetErr.json()),
    ).toEqual({ ok: false, error: "target_event_id required" });

    const missingPayloadErr = await notesHistoryPost(
      createAuthedRequest("http://local.test/api/notes-history", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": "ok-token",
        },
        body: JSON.stringify({ kind: "create", note_id: "note-1" }),
      }),
    );
    expect(missingPayloadErr.status).toBe(400);
    expect(
      notesHistoryPostErrorResponseSchema.parse(await missingPayloadErr.json()),
    ).toEqual({ ok: false, error: "payload required" });
  });

  test("/api/notes-history POST success contract", async () => {
    const res = await notesHistoryPost(
      createAuthedRequest("http://local.test/api/notes-history", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": "ok-token",
        },
        body: JSON.stringify({
          kind: "create",
          note_id: "note-1",
          payload_iv: "iv",
          payload_ciphertext: "cipher",
        }),
      }),
    );
    expect(res.status).toBe(200);
    const json = notesHistoryPostSuccessResponseSchema.parse(await res.json());
    expect(json.id.length).toBeGreaterThan(0);
  });

  test("/api/notes-history POST accepts null optional fields in create payload", async () => {
    const res = await notesHistoryPost(
      createAuthedRequest("http://local.test/api/notes-history", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": "ok-token",
        },
        body: JSON.stringify({
          kind: "create",
          note_id: "note-null-optional",
          target_event_id: null,
          payload_iv: "iv",
          payload_ciphertext: "cipher",
        }),
      }),
    );
    expect(res.status).toBe(200);
    const json = notesHistoryPostSuccessResponseSchema.parse(await res.json());
    expect(json.id.length).toBeGreaterThan(0);
  });

  test("/api/notes-stream unauthorized and stream contracts", async () => {
    const unauthorized = await notesStreamGet(
      new NextRequest("http://local.test/api/notes-stream"),
    );
    expect(unauthorized.status).toBe(401);
    expect(apiUnauthorizedErrorSchema.parse(await unauthorized.json())).toEqual(
      {
        ok: false,
        error: "unauthorized",
      },
    );

    const db = await getDb();
    const latestId = randomUUID();
    await db.execute({
      sql: "insert into notes_events(id, username, kind, note_id, target_event_id, payload_iv, payload_ciphertext) values(?,?,?,?,?,?,?)",
      args: [latestId, username, "delete", "note-1", null, null, null],
    });

    const controller = new AbortController();
    const streamRes = await notesStreamGet(
      createAuthedRequest("http://local.test/api/notes-stream", {
        signal: controller.signal,
      }),
    );

    expect(streamRes.status).toBe(200);
    expect(streamRes.headers.get("content-type")).toContain(
      "text/event-stream",
    );

    const events = await readSseEvents(streamRes, 2);
    controller.abort();

    expect(notesStreamHelloEventSchema.parse(events[0])).toEqual({
      event: "hello",
      data: { ok: true },
    });
    expect(notesStreamChangedEventSchema.parse(events[1])).toEqual({
      event: "notes:changed",
      data: { id: latestId },
    });
  });
});
