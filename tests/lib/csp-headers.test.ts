import { describe, expect, test } from "bun:test";

import { buildCsp } from "@/proxy";

describe("CSP policy", () => {
  test("includes required baseline directives", () => {
    const csp = buildCsp({ nonce: "abc" });

    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("script-src-attr 'none'");
  });

  test("uses nonce + strict-dynamic for scripts", () => {
    const csp = buildCsp({ nonce: "nonce123" });
    expect(csp).toContain("script-src 'nonce-nonce123' 'strict-dynamic'");
  });

  test("includes CSP reporting wiring", () => {
    const csp = buildCsp({ nonce: "abc" });
    expect(csp).toContain("report-to csp");
    expect(csp).toContain("report-uri /api/csp-report");
  });

  test("does not include unsafe-inline / unsafe-eval", () => {
    const csp = buildCsp({ nonce: "abc" });
    expect(csp).not.toContain("'unsafe-inline'");
    expect(csp).not.toContain("'unsafe-eval'");
  });
});
