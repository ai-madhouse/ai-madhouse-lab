export const runtime = "nodejs";

import type { NextRequest } from "next/server";

export async function GET(_request: NextRequest) {
  return Response.json(
    {
      ok: false,
      error: "gone",
      message:
        "This endpoint is deprecated. Use the E2EE event log API at /api/notes-history.",
    },
    { status: 410 },
  );
}

export async function POST(_request: NextRequest) {
  return Response.json(
    {
      ok: false,
      error: "gone",
      message:
        "This endpoint is deprecated. Use the E2EE event log API at /api/notes-history.",
    },
    { status: 410 },
  );
}
