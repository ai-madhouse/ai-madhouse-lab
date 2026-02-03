export const runtime = "nodejs";

import { normalizeCspReports } from "@/lib/csp-report";
import { consumeRateLimit } from "@/lib/rate-limit";

const MAX_BODY_BYTES = 64 * 1024; // keep it cheap; upstream should also cap

function getClientIp(request: Request): string {
  // If behind a reverse proxy, this may contain a comma-separated chain.
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(request: Request) {
  // Always respond quickly; do not reflect input.
  const len = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(len) && len > MAX_BODY_BYTES) {
    return new Response(null, {
      status: 204,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const ip = getClientIp(request);
  const rl = consumeRateLimit({
    key: `csp-report:${ip}`,
    limit: 30,
    windowSeconds: 60,
  });

  if (!rl.ok) {
    return new Response(null, {
      status: 204,
      headers: { "Cache-Control": "no-store" },
    });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return new Response(null, {
      status: 204,
      headers: { "Cache-Control": "no-store" },
    });
  }

  // Normalize + redact. Default behavior: drop on the floor.
  // In staging you can log this, or enqueue to a TTL sink.
  void normalizeCspReports(payload);

  return new Response(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
}
