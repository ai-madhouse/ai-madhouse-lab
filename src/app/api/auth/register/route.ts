export const runtime = "nodejs";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { clearAuthCookie, setAuthCookie, verifyCsrfToken } from "@/lib/auth";
import { normalizeLocale } from "@/lib/i18n";
import { consumeRateLimit } from "@/lib/rate-limit";
import { safeNextPath } from "@/lib/redirects";
import { getClientIp } from "@/lib/request";
import { registerFormSchema } from "@/lib/schemas/auth";
import { createSession } from "@/lib/sessions";
import { createUser } from "@/lib/users";

function redirectToRegister({
  request,
  locale,
  error,
  nextPath,
}: {
  request: NextRequest;
  locale: string;
  error: string;
  nextPath?: string;
}) {
  const params = new URLSearchParams({ error });
  if (nextPath) {
    params.set("next", nextPath);
  }

  return NextResponse.redirect(
    new URL(`/${locale}/register?${params.toString()}`, request.url),
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
    return redirectToRegister({
      request,
      locale: initialLocale,
      error: "csrf",
      nextPath: initialNextPath,
    });
  }

  const parsed = registerFormSchema.safeParse({
    locale: initialLocale,
    next: initialNextPath,
    username: String(formData.get("username") ?? ""),
    password: String(formData.get("password") ?? ""),
    password2: String(formData.get("password2") ?? ""),
    csrfToken: csrfTokenRaw,
  });

  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "invalid";
    return redirectToRegister({
      request,
      locale: initialLocale,
      error: msg,
    });
  }

  const { locale, next, username, csrfToken } = parsed.data;
  const password = String(formData.get("password") ?? "");
  const nextPath = safeNextPath(locale, next);

  const limiter = consumeRateLimit({
    key: `register:${username || "unknown"}`,
    limit: 10,
    windowSeconds: 60,
  });

  if (!limiter.ok) {
    return redirectToRegister({
      request,
      locale,
      error: "rate",
      nextPath,
    });
  }

  if (!(await verifyCsrfToken(csrfToken))) {
    return redirectToRegister({
      request,
      locale,
      error: "csrf",
      nextPath,
    });
  }

  try {
    await createUser({ username, password });
  } catch {
    return redirectToRegister({
      request,
      locale,
      error: "exists",
      nextPath,
    });
  }

  await clearAuthCookie();

  const ip = getClientIp(request.headers);
  const userAgent = request.headers.get("user-agent") ?? "";
  const session = await createSession({ username, ip, userAgent });
  await setAuthCookie(session.id);

  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      event: "user_registered",
      username,
      sessionId: session.id,
      ip,
      userAgent,
    }),
  );

  return NextResponse.redirect(new URL(nextPath, request.url));
}
