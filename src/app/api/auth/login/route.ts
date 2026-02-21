export const runtime = "nodejs";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { authenticate, setAuthCookie, verifyCsrfToken } from "@/lib/auth";
import { normalizeLocale } from "@/lib/i18n";
import { consumeRateLimit } from "@/lib/rate-limit";
import { safeNextPath } from "@/lib/redirects";
import { getClientIp } from "@/lib/request";
import { loginFormSchema } from "@/lib/schemas/auth";
import { createSession } from "@/lib/sessions";

function redirectToLogin({
  request,
  locale,
  error,
  nextPath,
}: {
  request: NextRequest;
  locale: string;
  error: string;
  nextPath: string;
}) {
  const params = new URLSearchParams({
    error,
    next: nextPath,
  });

  return NextResponse.redirect(
    new URL(`/${locale}/login?${params.toString()}`, request.url),
  );
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const initialLocale = normalizeLocale(String(formData.get("locale") ?? "en"));
  const initialNextPath = safeNextPath(
    initialLocale,
    String(formData.get("next") ?? ""),
  );
  const csrfTokenRaw = String(formData.get("csrfToken") ?? "");

  if (!csrfTokenRaw) {
    return redirectToLogin({
      request,
      locale: initialLocale,
      error: "csrf",
      nextPath: initialNextPath,
    });
  }

  const parsed = loginFormSchema.safeParse({
    locale: initialLocale,
    next: initialNextPath,
    username: String(formData.get("username") ?? ""),
    password: String(formData.get("password") ?? ""),
    csrfToken: csrfTokenRaw,
  });

  if (!parsed.success) {
    return redirectToLogin({
      request,
      locale: initialLocale,
      error: "1",
      nextPath: initialNextPath,
    });
  }

  const { locale, next, username, csrfToken } = parsed.data;
  const password = String(formData.get("password") ?? "");
  const nextPath = safeNextPath(locale, next);

  const limiter = consumeRateLimit({
    key: `login:${username || "unknown"}`,
    limit: 10,
    windowSeconds: 60,
  });

  if (!limiter.ok) {
    return redirectToLogin({ request, locale, error: "rate", nextPath });
  }

  if (!(await verifyCsrfToken(csrfToken))) {
    return redirectToLogin({ request, locale, error: "csrf", nextPath });
  }

  if (!(await authenticate(username, password))) {
    return redirectToLogin({ request, locale, error: "1", nextPath });
  }

  const ip = getClientIp(request.headers);
  const userAgent = request.headers.get("user-agent") ?? "";
  const session = await createSession({ username, ip, userAgent });

  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      event: "session_created",
      username,
      sessionId: session.id,
      expiresAt: session.expiresAt,
      ip,
      userAgent,
    }),
  );

  await setAuthCookie(session.id);
  return NextResponse.redirect(new URL(nextPath, request.url));
}
