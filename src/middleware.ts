import { type NextRequest, NextResponse } from "next/server";
import { locales, normalizeLocale } from "@/lib/i18n";

const PUBLIC_FILE = /\.[^/]+$/;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  const hasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );

  if (!hasLocale) {
    const url = request.nextUrl.clone();
    url.pathname = `/en${pathname}`;
    const response = NextResponse.redirect(url);
    response.cookies.set("NEXT_LOCALE", "en", { path: "/" });
    return response;
  }

  const locale = normalizeLocale(pathname.split("/").filter(Boolean)[0]);
  const response = NextResponse.next();
  response.cookies.set("NEXT_LOCALE", locale, { path: "/" });
  return response;
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
