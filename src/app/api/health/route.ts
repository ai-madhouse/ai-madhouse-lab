export const runtime = "nodejs";

import { dbHealthCheck } from "@/lib/db";

export async function GET() {
  try {
    const db = await dbHealthCheck();
    return Response.json({ ok: true, db }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
