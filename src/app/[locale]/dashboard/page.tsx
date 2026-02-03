import { Activity, FileText, ShieldCheck, Signal, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { CsrfTokenField } from "@/components/csrf/csrf-token-field";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { buttonClassName } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  clearAuthCookie,
  getSignedSessionIdFromCookies,
  verifyCsrfToken,
} from "@/lib/auth";
import { getUserDashboardMetrics } from "@/lib/dashboard-metrics";
import { getMessages, normalizeLocale } from "@/lib/i18n";
import { consumeRateLimit } from "@/lib/rate-limit";
import {
  deleteOtherSessionsForUser,
  deleteSessionsForUser,
  getSession,
} from "@/lib/sessions";
import { createTranslator } from "@/lib/translator";

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ ok?: string; error?: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = normalizeLocale(rawLocale);

  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const messages = await getMessages(locale);
  const t = createTranslator(messages, "Dashboard");

  const sid = await getSignedSessionIdFromCookies();
  const current = sid ? await getSession(sid) : null;
  const isAuthed = current !== null;

  const metrics = current
    ? await getUserDashboardMetrics(current.username)
    : null;

  async function revokeOtherSessionsAction(formData: FormData) {
    "use server";

    const csrfToken = String(formData.get("csrfToken") ?? "");
    if (!(await verifyCsrfToken(csrfToken))) {
      redirect(`/${locale}/dashboard?error=csrf`);
    }

    const sid = await getSignedSessionIdFromCookies();
    if (!sid) redirect(`/${locale}/login`);

    const current = await getSession(sid);
    if (!current) {
      await clearAuthCookie();
      redirect(`/${locale}/login`);
    }

    const limiter = consumeRateLimit({
      key: `revoke-other-sessions:${current.username}`,
      limit: 10,
      windowSeconds: 60,
    });

    if (!limiter.ok) {
      redirect(`/${locale}/dashboard?error=rate`);
    }

    await deleteOtherSessionsForUser({
      username: current.username,
      keepSessionId: sid,
    });

    redirect(`/${locale}/dashboard?ok=revoke`);
  }

  async function signOutEverywhereAction(formData: FormData) {
    "use server";

    const csrfToken = String(formData.get("csrfToken") ?? "");
    if (!(await verifyCsrfToken(csrfToken))) {
      redirect(`/${locale}/dashboard?error=csrf`);
    }

    const sid = await getSignedSessionIdFromCookies();
    if (sid) {
      const current = await getSession(sid);
      if (current) {
        await deleteSessionsForUser(current.username);
      }
    }

    await clearAuthCookie();
    redirect(`/${locale}/login`);
  }

  const okMessage = resolvedSearchParams?.ok;
  const errorMessage = resolvedSearchParams?.error;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader isAuthed={isAuthed} />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-12">
        <section className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {t("eyebrow")}
          </p>
          <h1 className="text-3xl font-semibold md:text-4xl">{t("title")}</h1>
          <p className="max-w-2xl text-muted-foreground">{t("subtitle")}</p>
        </section>

        {okMessage ? (
          <div className="rounded-xl border border-emerald-600/30 bg-emerald-600/10 p-3 text-sm text-emerald-700">
            {t("status.ok", { ok: okMessage })}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {t("status.error", { error: errorMessage })}
          </div>
        ) : null}

        <section className="grid gap-6 md:grid-cols-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("cards.sessions.label")}
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <CardDescription>{t("cards.sessions.note")}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">
                {metrics ? metrics.activeSessions : "–"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("cards.notes.label")}
                </CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </div>
              <CardDescription>{t("cards.notes.note")}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">
                {metrics ? metrics.notesCount : "–"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("cards.activity.label")}
                </CardTitle>
                <Signal className="h-4 w-4 text-muted-foreground" />
              </div>
              <CardDescription>{t("cards.activity.note")}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">
                {metrics ? metrics.notesEventsLastDay : "–"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("cards.realtime.label")}
                </CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </div>
              <CardDescription>{t("cards.realtime.note")}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">
                {metrics?.realtime?.ok ? t("realtime.ok") : t("realtime.off")}
              </p>
              {metrics?.realtime?.ok ? (
                <p className="text-xs text-muted-foreground">
                  {(metrics.realtime.usersConnected ?? 0) === 0 &&
                  (metrics.realtime.connectionsTotal ?? 0) === 0
                    ? t("realtime.detailZero")
                    : t("realtime.detail", {
                        users: String(metrics.realtime.usersConnected ?? 0),
                        conns: String(metrics.realtime.connectionsTotal ?? 0),
                      })}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle>{t("next.title")}</CardTitle>
              <CardDescription>{t("next.subtitle")}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Link href={`/${locale}/notes`} className={buttonClassName({})}>
                {t("next.notes")}
              </Link>
              <Link
                href={`/${locale}/live`}
                className={buttonClassName({ variant: "outline" })}
              >
                {t("next.live")}
              </Link>
              <Link
                href={`/${locale}/settings`}
                className={buttonClassName({ variant: "outline" })}
              >
                {t("next.settings")}
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-secondary/40">
            <CardHeader>
              <CardTitle>{t("security.title")}</CardTitle>
              <CardDescription>{t("security.subtitle")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-2xl border border-border/60 bg-background p-4">
                <p className="text-sm font-medium">{t("security.csp.title")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("security.csp.description")}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <form action={revokeOtherSessionsAction}>
                  <CsrfTokenField />
                  <button
                    type="submit"
                    className={buttonClassName({
                      variant: "outline",
                      size: "sm",
                    })}
                    disabled={!isAuthed}
                  >
                    {t("security.actions.revokeOthers")}
                  </button>
                </form>

                <form action={signOutEverywhereAction}>
                  <CsrfTokenField />
                  <button
                    type="submit"
                    className={buttonClassName({
                      variant: "destructive",
                      size: "sm",
                    })}
                    disabled={!isAuthed}
                  >
                    {t("security.actions.signOutEverywhere")}
                  </button>
                </form>
              </div>

              <p className="text-xs text-muted-foreground">
                <ShieldCheck className="mr-2 inline h-4 w-4" />
                {t("security.footer")}
              </p>
            </CardContent>
          </Card>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
