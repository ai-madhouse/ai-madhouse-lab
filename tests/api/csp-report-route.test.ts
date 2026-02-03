import { describe, expect, test } from "bun:test";

import { POST } from "@/app/api/csp-report/route";

describe("/api/csp-report", () => {
  test("returns 204 for valid payload", async () => {
    const res = await POST(
      new Request("http://local.test/api/csp-report", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify([
          {
            type: "csp-violation",
            body: {
              "document-uri": "https://site.test/a?token=1#x",
              "blocked-uri": "https://cdn.test/b.js?sig=2#y",
              "violated-directive": "script-src",
            },
          },
        ]),
      }),
    );

    expect(res.status).toBe(204);
  });

  test("returns 204 for malformed json (best-effort)", async () => {
    const res = await POST(
      new Request("http://local.test/api/csp-report", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{not json}",
      }),
    );

    expect(res.status).toBe(204);
  });

  test("drops oversized bodies via content-length gate", async () => {
    const res = await POST(
      new Request("http://local.test/api/csp-report", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": String(200_000),
        },
        body: JSON.stringify({ x: "x".repeat(200_000) }),
      }),
    );

    expect(res.status).toBe(204);
  });

  test("rate limits burst (should not throw)", async () => {
    const N = 200;
    const reqs = Array.from({ length: N }, (_, i) =>
      POST(
        new Request("http://local.test/api/csp-report", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-forwarded-for": "203.0.113.10",
          },
          body: JSON.stringify({
            "csp-report": {
              "document-uri": `https://site.test/${i}?q=secret`,
              "blocked-uri": "https://evil.test/x?leak=1",
            },
          }),
        }),
      ),
    );

    const results = await Promise.all(reqs);
    for (const r of results) expect(r.status).toBe(204);
  });
});
