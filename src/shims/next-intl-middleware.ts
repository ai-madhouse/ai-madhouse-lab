import { type NextRequest, NextResponse } from "next/server";

export type MiddlewareConfig = {
  locales: string[];
  defaultLocale: string;
};

export default function createMiddleware(config: MiddlewareConfig) {
  return function nextIntlMiddleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const hasLocale = config.locales.some(
      (locale) =>
        pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
    );
    if (
      hasLocale ||
      pathname.startsWith("/_next") ||
      pathname.startsWith("/api")
    ) {
      return NextResponse.next();
    }
    const url = request.nextUrl.clone();
    url.pathname = `/${config.defaultLocale}${pathname}`;
    return NextResponse.redirect(url);
  };
}
