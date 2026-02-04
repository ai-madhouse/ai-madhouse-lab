import { type NextRequest, NextResponse } from "next/server";
import { clearAuthCookie, getSignedSessionIdFromCookies } from "@/lib/auth";
import { normalizeLocale } from "@/lib/i18n";
import { deleteSession, getSession } from "@/lib/sessions";
import { notifySessionsChanged } from "@/lib/sessions-notify";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ locale: string }> },
) {
  const { locale: rawLocale } = await context.params;
  const locale = normalizeLocale(rawLocale);

  const sessionId = await getSignedSessionIdFromCookies();
  if (sessionId) {
    const session = await getSession(sessionId);
    await deleteSession(sessionId);
    if (session) {
      await notifySessionsChanged({ username: session.username });
    }
  }

  await clearAuthCookie();

  return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
}
