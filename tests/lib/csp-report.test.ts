import { describe, expect, test } from "bun:test";

import { normalizeCspReports, redactUrlish } from "@/lib/csp-report";

describe("csp-report", () => {
  test("redactUrlish drops query + fragment", () => {
    expect(redactUrlish("https://x.test/a?token=1#frag")).toBe(
      "https://x.test/a",
    );
  });

  test("redactUrlish returns undefined for non-url", () => {
    expect(redactUrlish("not a url")).toBeUndefined();
  });

  test("normalize handles legacy csp-report object", () => {
    const out = normalizeCspReports({
      "csp-report": {
        "document-uri": "https://site.test/p?secret=1",
        "blocked-uri": "https://evil.test/x?leak=1#y",
        "violated-directive": "script-src",
        "effective-directive": "script-src",
        disposition: "enforce",
        "status-code": 200,
      },
    });

    expect(out).toHaveLength(1);
    expect(out[0]?.document).toBe("https://site.test/p");
    expect(out[0]?.blocked).toBe("https://evil.test/x");
    expect(out[0]?.violatedDirective).toBe("script-src");
  });

  test("normalize handles Reporting API array objects", () => {
    const out = normalizeCspReports([
      {
        type: "csp-violation",
        body: {
          "document-uri": "https://site.test/a?x=1",
          "blocked-uri": "https://cdn.test/b.js?y=2",
          "violated-directive": "script-src",
        },
      },
    ]);

    expect(out).toHaveLength(1);
    expect(out[0]?.type).toBe("csp-violation");
    expect(out[0]?.document).toBe("https://site.test/a");
    expect(out[0]?.blocked).toBe("https://cdn.test/b.js");
  });

  test("normalize caps events", () => {
    const payload = Array.from({ length: 50 }, (_, i) => ({
      type: "csp-violation",
      body: { "document-uri": `https://site.test/${i}?q=1` },
    }));

    const out = normalizeCspReports(payload, { maxEvents: 20 });
    expect(out).toHaveLength(20);
  });
});
