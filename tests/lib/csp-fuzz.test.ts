import { describe, expect, test } from "bun:test";

import { normalizeCspReports, redactUrlish } from "@/lib/csp-report";
import { buildCsp } from "@/proxy";

function mulberry32(seed: number) {
  return () => {
    seed += 0x6d2b79f5;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, items: T[]): T {
  return items[Math.floor(rng() * items.length)] as T;
}

function randInt(rng: () => number, min: number, max: number) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function randStr(rng: () => number, len: number) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < len; i++)
    out += alphabet[Math.floor(rng() * alphabet.length)];
  return out;
}

function randUrl(rng: () => number) {
  const host = `${randStr(rng, randInt(rng, 3, 10))}.test`;
  const path = `/${randStr(rng, randInt(rng, 1, 10))}`;
  const q = rng() < 0.7 ? `?${randStr(rng, 4)}=${randStr(rng, 8)}` : "";
  const h = rng() < 0.5 ? `#${randStr(rng, 6)}` : "";
  return `https://${host}${path}${q}${h}`;
}

describe("CSP fuzz / invariants", () => {
  test("redactUrlish never returns a value with query or fragment", () => {
    const rng = mulberry32(12345);

    for (let i = 0; i < 250; i++) {
      const url = randUrl(rng);
      const redacted = redactUrlish(url);
      expect(redacted).toBeDefined();

      if (!redacted) continue;
      expect(redacted).not.toContain("?");
      expect(redacted).not.toContain("#");
    }
  });

  test("normalizeCspReports never throws for weird payload shapes", () => {
    const rng = mulberry32(54321);

    const weird: unknown[] = [
      null,
      undefined,
      0,
      1,
      true,
      false,
      "string",
      { x: 1 },
      { body: { "document-uri": randUrl(rng), "blocked-uri": randUrl(rng) } },
      {
        "csp-report": {
          "document-uri": randUrl(rng),
          "blocked-uri": randUrl(rng),
        },
      },
      [{ type: "csp-violation", body: { "document-uri": randUrl(rng) } }],
    ];

    for (let i = 0; i < 300; i++) {
      const payload = pick(rng, weird);
      const out = normalizeCspReports(payload);
      expect(Array.isArray(out)).toBe(true);
      expect(out.length).toBeLessThanOrEqual(20);

      // Ensure outputs are redacted.
      for (const e of out) {
        if (e.document) {
          expect(e.document).not.toContain("?");
          expect(e.document).not.toContain("#");
        }
        if (e.blocked) {
          expect(e.blocked).not.toContain("?");
          expect(e.blocked).not.toContain("#");
        }
      }
    }
  });

  test("buildCsp produces a single directive string with no newlines", () => {
    const csp = buildCsp({ nonce: "abc" });
    expect(csp).not.toContain("\n");

    // Basic shape sanity.
    const parts = csp
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);
    expect(parts.length).toBeGreaterThan(5);

    // Should not accidentally include unsafe directives.
    expect(csp).not.toContain("'unsafe-inline'");
    expect(csp).not.toContain("'unsafe-eval'");
  });
});
