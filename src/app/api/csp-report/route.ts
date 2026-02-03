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

// In production we intentionally drop reports on the floor.
// In E2E_TEST mode we keep a tiny in-memory ring buffer for assertions.
const e2eBuffer: {
  at: number;
  reports: ReturnType<typeof normalizeCspReports>;
}[] = [];

function pushE2E(reports: ReturnType<typeof normalizeCspReports>) {
  if (process.env.E2E_TEST !== "1") return;
  e2eBuffer.push({ at: Date.now(), reports });
  if (e2eBuffer.length > 50) e2eBuffer.splice(0, e2eBuffer.length - 50);
}

export async function GET() {
  if (process.env.E2E_TEST !== "1") {
    return Response.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const last = e2eBuffer.at(-1) ?? null;
  return Response.json(
    {
      ok: true,
      count: e2eBuffer.length,
      last,
    },
    { status: 200 },
  );
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

  const normalized = normalizeCspReports(payload);
  pushE2E(normalized);

  return new Response(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
}
