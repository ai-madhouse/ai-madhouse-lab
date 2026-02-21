import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { DashboardMetricsGrid } from "@/components/dashboard/dashboard-metrics-grid";
import { DashboardSecurityActions } from "@/components/dashboard/dashboard-security-actions";
import { buttonClassName } from "@/components/roiui/button";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getMessages, normalizeLocale } from "@/lib/i18n";
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

  const okMessage = resolvedSearchParams?.ok;
  const errorMessage = resolvedSearchParams?.error;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main
        className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-12"
        data-layout-root="dashboard-layout"
        data-layout-key="dashboard-main"
      >
        <section className="space-y-2" data-layout-key="dashboard-intro">
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

        <DashboardMetricsGrid />

        <section
          className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]"
          data-layout-key="dashboard-actions"
        >
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

              <DashboardSecurityActions
                revokeLabel={t("security.actions.revokeOthers")}
                signOutLabel={t("security.actions.signOutEverywhere")}
              />

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
