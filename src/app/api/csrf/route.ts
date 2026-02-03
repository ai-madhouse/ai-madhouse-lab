export const runtime = "nodejs";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { csrfCookieName, generateCsrfToken } from "@/lib/csrf";

export async function GET() {
  // Important: do NOT rotate the CSRF cookie on every request.
  // Multiple components/forms may request a token; if we rotate it, older forms
  // will submit a stale token and fail CSRF verification.
  const existing = (await cookies()).get(csrfCookieName)?.value;
  const token = existing || generateCsrfToken();

  const response = NextResponse.json({ ok: true, token });

  if (!existing) {
    response.cookies.set(csrfCookieName, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 2,
    });
  }

  return response;
}
