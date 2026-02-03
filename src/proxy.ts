import { type NextRequest, NextResponse } from "next/server";

import { authCookieName, decodeAndVerifySessionCookie } from "@/lib/auth";
import { decideProxyAction } from "@/lib/proxy-logic";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const rawCookie = request.cookies.get(authCookieName)?.value;
  const sessionId = decodeAndVerifySessionCookie(rawCookie);

  const decision = decideProxyAction({
    pathname,
    search,
    authCookieValue: sessionId ? "1" : undefined,
  });

  if (decision.kind === "redirect") {
    const url = request.nextUrl.clone();
    url.pathname = decision.toPath;
    // decision.toPath includes search already, so clear Next.js-managed search to avoid duplication.
    // We set pathname to the whole path; if it contains ?, Next will preserve it.
    const response = NextResponse.redirect(url);
    if (decision.setLocaleCookie) {
      response.cookies.set("NEXT_LOCALE", decision.setLocaleCookie, {
        path: "/",
      });
    }
    return response;
  }

  const response = NextResponse.next();
  if (decision.setLocaleCookie) {
    response.cookies.set("NEXT_LOCALE", decision.setLocaleCookie, {
      path: "/",
    });
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
