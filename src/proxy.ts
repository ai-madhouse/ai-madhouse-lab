import { type NextRequest, NextResponse } from "next/server";

import { authCookieName, decodeAndVerifySessionCookie } from "@/lib/auth";
import { decideProxyAction } from "@/lib/proxy-logic";
import { getSession } from "@/lib/sessions";

function applySecurityHeaders(response: NextResponse) {
  // Minimal, production-safe defaults. Prefer enforcing these at the edge too.
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  response.headers.set("X-DNS-Prefetch-Control", "off");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-site");

  // CSP is valuable but easy to get wrong in Next.js. We keep it conservative
  // and only enforce in production. (In dev, HMR often relies on inline/eval.)
  if (process.env.NODE_ENV === "production") {
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "img-src 'self' data: blob:",
      // Note: Next often needs inline scripts unless you implement nonces.
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      // Allow websockets in production deployments (ports may differ).
      "connect-src 'self' https: wss: ws:",
      "font-src 'self' data:",
    ].join("; ");

    response.headers.set("Content-Security-Policy", csp);
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=15552000; includeSubDomains",
    );
  }

  return response;
}

function setLocaleCookie(response: NextResponse, locale: string) {
  // Not a secret, but treat it like a regular cookie to reduce audit noise and
  // to avoid it being tampered via XSS.
  response.cookies.set("NEXT_LOCALE", locale, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const rawCookie = request.cookies.get(authCookieName)?.value;
  const sessionId = decodeAndVerifySessionCookie(rawCookie);

  const isAuthed = sessionId ? (await getSession(sessionId)) !== null : false;

  const decision = decideProxyAction({
    pathname,
    search,
    isAuthed,
  });

  if (decision.kind === "redirect") {
    // decision.toPath may include a query string; handle it explicitly.
    const url = request.nextUrl.clone();
    const [toPathname, toSearch] = decision.toPath.split("?");
    url.pathname = toPathname;
    url.search = toSearch ? `?${toSearch}` : "";

    const response = NextResponse.redirect(url);
    if (decision.setLocaleCookie) {
      setLocaleCookie(response, decision.setLocaleCookie);
    }
    return applySecurityHeaders(response);
  }

  const response = NextResponse.next();
  if (decision.setLocaleCookie) {
    setLocaleCookie(response, decision.setLocaleCookie);
  }
  return applySecurityHeaders(response);
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
