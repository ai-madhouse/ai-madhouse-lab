export const runtime = "nodejs";

import { getAppInfo } from "@/lib/app-info";
import { dbHealthCheck } from "@/lib/db";

export async function GET() {
  try {
    const db = await dbHealthCheck();
    const app = getAppInfo();
    return Response.json({ ok: true, db, app }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
