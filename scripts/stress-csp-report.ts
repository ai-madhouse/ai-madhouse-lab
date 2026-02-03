import { POST } from "@/app/api/csp-report/route";

function reqJson({
  body,
  headers,
}: {
  body: unknown;
  headers?: Record<string, string>;
}) {
  return new Request("http://local.test/api/csp-report", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

async function run() {
  const start = Date.now();

  // 1) Happy path (Reporting API shape)
  await POST(
    reqJson({
      body: [
        {
          type: "csp-violation",
          body: {
            "document-uri": "https://site.test/a?token=1#x",
            "blocked-uri": "https://cdn.test/b.js?sig=2#y",
            "violated-directive": "script-src",
          },
        },
      ],
    }),
  );

  // 2) Malformed JSON
  await POST(
    new Request("http://local.test/api/csp-report", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not json}",
    }),
  );

  // 3) Oversized body (content-length gate)
  await POST(
    reqJson({
      body: { x: "x".repeat(200_000) },
      headers: { "content-length": String(200_000) },
    }),
  );

  // 4) Aggressive burst (will get rate-limited, but should remain stable)
  const N = 250;
  const burst = Array.from({ length: N }, (_, i) =>
    POST(
      reqJson({
        body: {
          "csp-report": {
            "document-uri": `https://site.test/${i}?q=secret`,
            "blocked-uri": "https://evil.test/x?leak=1",
          },
        },
        headers: { "x-forwarded-for": "203.0.113.10" },
      }),
    ),
  );

  await Promise.all(burst);

  const elapsed = Date.now() - start;
  console.log(`stress-csp-report: ok (${N} burst), ${elapsed}ms`);
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
