import crypto from "node:crypto";

import { type NextRequest, NextResponse } from "next/server";

import { authCookieName, decodeAndVerifySessionCookie } from "@/lib/auth";
import { decideProxyAction } from "@/lib/proxy-logic";
import { getSession } from "@/lib/sessions";

function createNonce() {
  return crypto.randomBytes(16).toString("base64url");
}

function parseLocalHost(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "[::1]"
  );
}

function toWsOrigin(input: string, baseOrigin: string) {
  try {
    const url = new URL(input, baseOrigin);
    if (url.protocol === "http:") url.protocol = "ws:";
    if (url.protocol === "https:") url.protocol = "wss:";
    if (url.protocol !== "ws:" && url.protocol !== "wss:") return null;
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

function getRealtimeConnectSource(baseOrigin: string) {
  const explicitUrl = process.env.NEXT_PUBLIC_REALTIME_URL?.trim();
  if (explicitUrl) return toWsOrigin(explicitUrl, baseOrigin);

  const explicitPort = process.env.NEXT_PUBLIC_REALTIME_PORT?.trim();
  if (explicitPort) {
    try {
      const origin = new URL(baseOrigin);
      const protocol = origin.protocol === "https:" ? "wss:" : "ws:";
      return `${protocol}//${origin.hostname}:${explicitPort}`;
    } catch {
      return null;
    }
  }

  try {
    const origin = new URL(baseOrigin);
    if (!parseLocalHost(origin.hostname)) return null;
    const protocol = origin.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${origin.hostname}:8787`;
  } catch {
    return null;
  }
}

function getSentrySecurityCspEndpoint(): string | null {
  const dsn = (process.env.SENTRY_DSN || "").trim();
  if (!dsn) return null;

  try {
    const u = new URL(dsn);
    const publicKey = u.username;
    const host = u.host;
    const projectId = u.pathname.replace(/^\//, "");

    if (!publicKey || !host || !projectId) return null;

    return `https://${host}/api/${projectId}/security/?sentry_key=${publicKey}`;
  } catch {
    return null;
  }
}

export function buildCsp({
  nonce,
  requestOrigin,
}: {
  nonce: string;
  requestOrigin?: string;
}) {
  // "nonce-..." is the hook Next.js uses to automatically add nonce attributes
  // to framework scripts/bundles/styles during dynamic SSR.
  //
  // We intentionally avoid 'unsafe-inline' / 'unsafe-eval' in production.
  //
  // Reporting:
  // - Prefer Reporting-Endpoints + `report-to`.
  // - Keep `report-uri` as a practical fallback for coverage.
  const sentryEndpoint = getSentrySecurityCspEndpoint();
  const sentryHost = sentryEndpoint ? new URL(sentryEndpoint).origin : null;

  const realtimeSource = requestOrigin
    ? getRealtimeConnectSource(requestOrigin)
    : null;
  const connectSources = new Set<string>([
    "'self'",
    ...(sentryHost ? [sentryHost] : []),
    ...(realtimeSource ? [realtimeSource] : []),
  ]);
  const connectSrc = Array.from(connectSources).join(" ");

  const reportUris = [
    // Always keep local endpoint as a fallback.
    "/api/csp-report",
    ...(sentryEndpoint ? [sentryEndpoint] : []),
  ].join(" ");

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `script-src 'nonce-${nonce}' 'strict-dynamic'`,
    // Next.js may emit inline <style> tags; nonce makes them legal.
    `style-src 'self' 'nonce-${nonce}'`,
    // Block inline event handlers.
    "script-src-attr 'none'",
    // By default we assume same-origin websockets via reverse proxy.
    // If realtime runs on a different origin, add it explicitly.
    `connect-src ${connectSrc}`,
    // Reporting wiring:
    // - Local (same-origin) endpoint exists for safety and tests.
    // - Sentry security endpoint (if configured) gets direct browser reports.
    sentryEndpoint ? "report-to csp-endpoint" : "report-to csp",
    `report-uri ${reportUris}`,
  ].join("; ");
}

export function applySecurityHeaders(
  response: NextResponse,
  opts?: { nonce?: string; csp?: string; requestOrigin?: string },
) {
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

  if (process.env.NODE_ENV === "production") {
    const effectiveNonce = opts?.nonce ?? createNonce();
    const csp =
      opts?.csp ??
      buildCsp({ nonce: effectiveNonce, requestOrigin: opts?.requestOrigin });

    // Map endpoint-name -> URL for Reporting API.
    const sentryEndpoint = getSentrySecurityCspEndpoint();
    const reportingEndpoints = [
      'csp="/api/csp-report"',
      ...(sentryEndpoint ? [`csp-endpoint="${sentryEndpoint}"`] : []),
    ].join(", ");

    response.headers.set("Reporting-Endpoints", reportingEndpoints);

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

  // Only needed in production (dev HMR often relies on eval/inline).
  const nonce =
    process.env.NODE_ENV === "production" ? createNonce() : undefined;
  const csp = nonce
    ? buildCsp({ nonce, requestOrigin: request.nextUrl.origin })
    : undefined;

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
    return applySecurityHeaders(response, {
      nonce,
      csp,
      requestOrigin: request.nextUrl.origin,
    });
  }

  const requestHeaders = new Headers(request.headers);
  if (nonce && csp) {
    // Next.js reads the nonce from the CSP header during SSR.
    requestHeaders.set("Content-Security-Policy", csp);
    requestHeaders.set("x-nonce", nonce);
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  if (decision.setLocaleCookie) {
    setLocaleCookie(response, decision.setLocaleCookie);
  }
  return applySecurityHeaders(response, {
    nonce,
    csp,
    requestOrigin: request.nextUrl.origin,
  });
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
