import { type NextRequest, NextResponse } from "next/server";
import { clearAuthCookie, getSignedSessionIdFromCookies } from "@/lib/auth";
import { normalizeLocale } from "@/lib/i18n";
import { deleteSession } from "@/lib/sessions";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ locale: string }> },
) {
  const { locale: rawLocale } = await context.params;
  const locale = normalizeLocale(rawLocale);

  const sessionId = await getSignedSessionIdFromCookies();
  if (sessionId) {
    await deleteSession(sessionId);
  }

  await clearAuthCookie();

  return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
}
