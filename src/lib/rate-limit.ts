type Bucket = {
  count: number;
  resetAtMs: number;
};

const buckets = new Map<string, Bucket>();

export type RateLimitResult =
  | { ok: true; remaining: number; resetAtMs: number }
  | { ok: false; resetAtMs: number };

export function consumeRateLimit({
  key,
  limit,
  windowSeconds,
  nowMs = Date.now(),
}: {
  key: string;
  limit: number;
  windowSeconds: number;
  nowMs?: number;
}): RateLimitResult {
  const windowMs = windowSeconds * 1000;
  const existing = buckets.get(key);

  if (!existing || existing.resetAtMs <= nowMs) {
    const resetAtMs = nowMs + windowMs;
    buckets.set(key, { count: 1, resetAtMs });
    return { ok: true, remaining: Math.max(0, limit - 1), resetAtMs };
  }

  if (existing.count >= limit) {
    return { ok: false, resetAtMs: existing.resetAtMs };
  }

  existing.count += 1;
  return {
    ok: true,
    remaining: Math.max(0, limit - existing.count),
    resetAtMs: existing.resetAtMs,
  };
}

export function clearRateLimit(key: string) {
  buckets.delete(key);
}
