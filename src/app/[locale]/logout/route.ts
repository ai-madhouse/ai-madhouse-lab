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

  let notifyUsername: string | null = null;

  try {
    const sessionId = await getSignedSessionIdFromCookies();
    if (sessionId) {
      const session = await getSession(sessionId);
      notifyUsername = session?.username ?? null;
      await deleteSession(sessionId);
    }
  } catch {
    // Best-effort logout: always clear cookie and redirect to login.
  } finally {
    await clearAuthCookie();
  }

  if (notifyUsername) {
    await notifySessionsChanged({ username: notifyUsername }).catch(() => {
      // ignore
    });
  }

  return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
}
