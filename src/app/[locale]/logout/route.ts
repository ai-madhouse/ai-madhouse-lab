import { NextResponse } from "next/server";
import { authCookieName } from "@/lib/auth";
import { normalizeLocale } from "@/lib/i18n";

export async function GET(
  request: Request,
  { params }: { params: { locale: string } },
) {
  const locale = normalizeLocale(params.locale);
  const response = NextResponse.redirect(
    new URL(`/${locale}/login`, request.url),
  );
  response.cookies.set(authCookieName, "", {
    path: "/",
    expires: new Date(0),
  });
  return response;
}
