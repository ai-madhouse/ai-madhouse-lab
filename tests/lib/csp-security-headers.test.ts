import { describe, expect, test } from "bun:test";

import { NextResponse } from "next/server";

import { applySecurityHeaders, buildCsp } from "@/proxy";

function withEnv(env: Record<string, string | undefined>, fn: () => void) {
  const prev: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(env)) {
    prev[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }

  try {
    fn();
  } finally {
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

describe("security headers", () => {
  test("does not set CSP/Reporting headers outside production", () => {
    withEnv({ NODE_ENV: "development" }, () => {
      const res = applySecurityHeaders(NextResponse.next());

      expect(res.headers.get("Content-Security-Policy")).toBeNull();
      expect(res.headers.get("Reporting-Endpoints")).toBeNull();
      expect(res.headers.get("Strict-Transport-Security")).toBeNull();

      // But baseline security headers should still exist.
      expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(res.headers.get("X-Frame-Options")).toBe("DENY");
    });
  });

  test("sets CSP + Reporting-Endpoints + HSTS in production", () => {
    withEnv({ NODE_ENV: "production" }, () => {
      const nonce = "fixed-nonce";
      const csp = buildCsp({ nonce });

      const res = applySecurityHeaders(NextResponse.next(), {
        nonce,
        csp,
      });

      expect(res.headers.get("Reporting-Endpoints")).toBe(
        'csp="/api/csp-report"',
      );

      const header = res.headers.get("Content-Security-Policy");
      expect(header).not.toBeNull();
      expect(header).toContain("nonce-fixed-nonce");
      expect(header).toContain("report-to csp");
      expect(header).toContain("report-uri /api/csp-report");

      expect(res.headers.get("Strict-Transport-Security")).toContain(
        "max-age=",
      );
    });
  });

  test("generates a nonce when not supplied (production)", () => {
    withEnv({ NODE_ENV: "production" }, () => {
      const a = applySecurityHeaders(NextResponse.next());
      const b = applySecurityHeaders(NextResponse.next());

      const cspA = a.headers.get("Content-Security-Policy");
      const cspB = b.headers.get("Content-Security-Policy");

      expect(cspA).not.toBeNull();
      expect(cspB).not.toBeNull();

      // Not a cryptographic proof; just sanity that we aren't reusing a constant.
      expect(cspA).not.toBe(cspB);
    });
  });
});
