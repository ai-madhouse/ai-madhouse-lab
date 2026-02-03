export const runtime = "nodejs";

import { getAppInfo } from "@/lib/app-info";
import { dbHealthCheck } from "@/lib/db";

export async function GET() {
  try {
    const db = await dbHealthCheck();
    const app = getAppInfo();

    // Don't leak internal paths/config in production health checks.
    const isProd = process.env.NODE_ENV === "production";

    return Response.json(
      {
        ok: true,
        db: isProd ? { ok: db.ok } : db,
        app: isProd ? { version: app.version, commit: app.commit } : app,
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
