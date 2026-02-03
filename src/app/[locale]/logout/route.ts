import { type NextRequest, NextResponse } from "next/server";
import { authCookieName } from "@/lib/auth";
import { normalizeLocale } from "@/lib/i18n";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ locale: string }> },
) {
  const { locale: rawLocale } = await context.params;
  const locale = normalizeLocale(rawLocale);

  const response = NextResponse.redirect(
    new URL(`/${locale}/login`, request.url),
  );
  response.cookies.set(authCookieName, "", {
    path: "/",
    expires: new Date(0),
  });
  return response;
}
