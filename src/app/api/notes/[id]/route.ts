export const runtime = "nodejs";

import type { NextRequest } from "next/server";

import { deprecatedNotesEndpointResponse } from "@/lib/server/deprecated-notes-endpoint";

export async function GET(_request: NextRequest) {
  return deprecatedNotesEndpointResponse();
}

export async function PUT(_request: NextRequest) {
  return deprecatedNotesEndpointResponse();
}

export async function DELETE(_request: NextRequest) {
  return deprecatedNotesEndpointResponse();
}
