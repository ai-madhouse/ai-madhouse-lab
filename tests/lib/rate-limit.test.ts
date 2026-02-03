import { describe, expect, test } from "bun:test";
import { clearRateLimit, consumeRateLimit } from "@/lib/rate-limit";

describe("rate limit", () => {
  test("allows up to limit within window then blocks", () => {
    const key = "k1";
    clearRateLimit(key);

    const t0 = 1_000_000;

    expect(
      consumeRateLimit({ key, limit: 2, windowSeconds: 60, nowMs: t0 }).ok,
    ).toBe(true);
    expect(
      consumeRateLimit({ key, limit: 2, windowSeconds: 60, nowMs: t0 + 1 }).ok,
    ).toBe(true);
    expect(
      consumeRateLimit({ key, limit: 2, windowSeconds: 60, nowMs: t0 + 2 }).ok,
    ).toBe(false);
  });

  test("resets after window", () => {
    const key = "k2";
    clearRateLimit(key);

    const t0 = 2_000_000;

    expect(
      consumeRateLimit({ key, limit: 1, windowSeconds: 1, nowMs: t0 }).ok,
    ).toBe(true);
    expect(
      consumeRateLimit({ key, limit: 1, windowSeconds: 1, nowMs: t0 + 10 }).ok,
    ).toBe(false);

    expect(
      consumeRateLimit({ key, limit: 1, windowSeconds: 1, nowMs: t0 + 2000 })
        .ok,
    ).toBe(true);
  });
});
