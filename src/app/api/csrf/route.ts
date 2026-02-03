export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { csrfCookieName, generateCsrfToken } from "@/lib/csrf";

export async function GET() {
  const token = generateCsrfToken();

  const response = NextResponse.json({ ok: true, token });
  response.cookies.set(csrfCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 2,
  });

  return response;
}
