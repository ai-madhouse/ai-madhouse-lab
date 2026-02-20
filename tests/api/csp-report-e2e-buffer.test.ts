import { describe, expect, test } from "bun:test";

import { GET, POST } from "@/app/api/csp-report/route";
import {
  cspReportE2EDisabledResponseSchema,
  cspReportE2EEnabledResponseSchema,
} from "@/lib/schemas/internal-api";

describe("/api/csp-report e2e buffer", () => {
  test("GET is 404 when E2E_TEST is off", async () => {
    const prev = process.env.E2E_TEST;
    delete process.env.E2E_TEST;
    try {
      const res = await GET();
      expect(res.status).toBe(404);
      expect(
        cspReportE2EDisabledResponseSchema.parse(await res.json()),
      ).toEqual({
        ok: false,
        error: "not_found",
      });
    } finally {
      if (prev) process.env.E2E_TEST = prev;
    }
  });

  test("buffers normalized reports when E2E_TEST=1", async () => {
    const prev = process.env.E2E_TEST;
    process.env.E2E_TEST = "1";

    try {
      await POST(
        new Request("http://local.test/api/csp-report", {
          method: "POST",
          headers: { "content-type": "application/reports+json" },
          body: JSON.stringify([
            {
              type: "csp-violation",
              body: {
                "document-uri": "https://site.test/a?token=1#x",
                "blocked-uri": "https://evil.test/b.js?sig=2#y",
                "violated-directive": "script-src",
              },
            },
          ]),
        }),
      );

      const res = await GET();
      expect(res.status).toBe(200);
      const json = cspReportE2EEnabledResponseSchema.parse(await res.json());
      expect(json.ok).toBe(true);
      expect(json.count).toBeGreaterThan(0);

      const last = json.last;
      expect(last).toBeTruthy();
      expect(last?.reports?.[0]?.document).toBe("https://site.test/a");
      expect(last?.reports?.[0]?.blocked).toBe("https://evil.test/b.js");
    } finally {
      if (prev === undefined) delete process.env.E2E_TEST;
      else process.env.E2E_TEST = prev;
    }
  });
});
