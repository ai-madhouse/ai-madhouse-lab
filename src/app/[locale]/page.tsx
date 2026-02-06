import { ArrowRight, LineChart, Rocket, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { buttonClassName } from "@/components/roiui/button";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { isAuthenticated } from "@/lib/auth";
import { getMessages, normalizeLocale } from "@/lib/i18n";
import { createTranslator } from "@/lib/translator";

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = normalizeLocale(rawLocale);
  const messages = await getMessages(locale);
  const t = createTranslator(messages, "Landing");
  const isAuthed = await isAuthenticated();

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader isAuthed={isAuthed} />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 py-12">
        <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-6">
            <Badge variant="secondary">{t("badge")}</Badge>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
              {t("title")}
            </h1>
            <p className="text-lg text-muted-foreground md:text-xl">
              {t("subtitle")}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href={
                  isAuthed
                    ? `/${locale}/dashboard`
                    : `/${locale}/login?next=${encodeURIComponent(`/${locale}/dashboard`)}`
                }
                className={buttonClassName({ className: "gap-2" })}
              >
                {t("ctaPrimary")}
                <ArrowRight
                  className="h-4 w-4"
                  aria-label={t("ctaPrimaryIcon")}
                />
              </Link>
              <Link
                href={
                  isAuthed
                    ? `/${locale}/settings`
                    : `/${locale}/login?next=${encodeURIComponent(`/${locale}/settings`)}`
                }
                className={buttonClassName({ variant: "outline" })}
              >
                {t("ctaSecondary")}
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { key: "latency" },
                { key: "uptime" },
                { key: "experiments" },
              ].map((item) => (
                <div
                  key={item.key}
                  className="rounded-2xl border border-border/60 bg-card p-4"
                >
                  <p className="text-sm text-muted-foreground">
                    {t(`stats.${item.key}.label`)}
                  </p>
                  <p className="text-2xl font-semibold">
                    {t(`stats.${item.key}.value`)}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <Card className="bg-gradient-to-br from-card via-card to-secondary/40">
            <CardHeader>
              <CardTitle>{t("heroCard.title")}</CardTitle>
              <CardDescription>{t("heroCard.subtitle")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {["signal", "guardrails", "playbooks"].map((item) => (
                <div key={item} className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    {t(`heroCard.${item}.eyebrow`)}
                  </p>
                  <p className="text-base font-medium">
                    {t(`heroCard.${item}.title`)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t(`heroCard.${item}.description`)}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <section className="space-y-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {t("features.eyebrow")}
              </p>
              <h2 className="text-3xl font-semibold">{t("features.title")}</h2>
            </div>
            <p className="max-w-xl text-muted-foreground">
              {t("features.subtitle")}
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <Rocket
                  className="h-5 w-5"
                  aria-label={t("features.cards.experience.icon")}
                />
                <CardTitle>{t("features.cards.experience.title")}</CardTitle>
                <CardDescription>
                  {t("features.cards.experience.description")}
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <LineChart
                  className="h-5 w-5"
                  aria-label={t("features.cards.engineering.icon")}
                />
                <CardTitle>{t("features.cards.engineering.title")}</CardTitle>
                <CardDescription>
                  {t("features.cards.engineering.description")}
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <ShieldCheck
                  className="h-5 w-5"
                  aria-label={t("features.cards.security.icon")}
                />
                <CardTitle>{t("features.cards.security.title")}</CardTitle>
                <CardDescription>
                  {t("features.cards.security.description")}
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <CardHeader>
              <CardTitle>{t("timeline.title")}</CardTitle>
              <CardDescription>{t("timeline.subtitle")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {["discover", "shape", "ship"].map((item) => (
                <div key={item} className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    {t(`timeline.${item}.eyebrow`)}
                  </p>
                  <p className="text-base font-medium">
                    {t(`timeline.${item}.title`)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t(`timeline.${item}.description`)}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="bg-secondary/40">
            <CardHeader>
              <CardTitle>{t("signal.title")}</CardTitle>
              <CardDescription>{t("signal.subtitle")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {["drift", "guard", "launch"].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-border/60 bg-background/70 p-4"
                >
                  <p className="text-sm font-medium">
                    {t(`signal.${item}.title`)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t(`signal.${item}.description`)}
                  </p>
                </div>
              ))}
              <Separator />
              <p className="text-sm text-muted-foreground">
                {t("signal.footer")}
              </p>
            </CardContent>
          </Card>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
