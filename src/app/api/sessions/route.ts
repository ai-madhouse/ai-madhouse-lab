export const runtime = "nodejs";

import type { NextRequest } from "next/server";

import { getDb } from "@/lib/db";
import { requireSessionFromRequest } from "@/lib/server/request-session";

export async function GET(request: NextRequest) {
  const session = await requireSessionFromRequest(request);
  if (!session) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  const res = await db.execute({
    sql: `
      select
        s.id,
        s.created_at,
        s.expires_at,
        m.payload_iv as meta_iv,
        m.payload_ciphertext as meta_ciphertext
      from sessions s
      left join sessions_meta m on m.session_id = s.id
      where s.username = ?
      order by s.created_at desc
    `,
    args: [session.username],
  });

  return Response.json({ ok: true, sessions: res.rows });
}
