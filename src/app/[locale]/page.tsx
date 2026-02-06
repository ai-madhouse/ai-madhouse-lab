import {
  ArrowRight,
  LineChart,
  Rocket,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
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
  const primaryHref = isAuthed
    ? `/${locale}/dashboard`
    : `/${locale}/login?next=${encodeURIComponent(`/${locale}/dashboard`)}`;
  const secondaryHref = isAuthed
    ? `/${locale}/settings`
    : `/${locale}/login?next=${encodeURIComponent(`/${locale}/settings`)}`;

  return (
    <div className="relative min-h-screen overflow-x-clip bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.18),transparent_55%),radial-gradient(circle_at_70%_20%,hsl(var(--secondary-foreground)/0.08),transparent_45%)]"
      />
      <SiteHeader isAuthed={isAuthed} />
      <main
        className="mx-auto flex w-full max-w-6xl flex-col gap-14 px-6 pb-16 pt-10 md:gap-20 md:pt-14"
        data-layout-root="landing-layout"
        data-layout-key="landing-main"
      >
        <section
          className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start"
          data-layout-key="landing-hero"
        >
          <div className="space-y-8">
            <div className="space-y-5">
              <Badge
                variant="secondary"
                className="rounded-full px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.16em]"
              >
                {t("badge")}
              </Badge>
              <h1 className="max-w-3xl text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
                {t("title")}
              </h1>
              <p className="max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
                {t("subtitle")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                data-testid="landing-primary-cta"
                href={primaryHref}
                className={buttonClassName({ size: "lg", className: "gap-2" })}
              >
                {t("ctaPrimary")}
                <ArrowRight
                  className="h-4 w-4"
                  aria-label={t("ctaPrimaryIcon")}
                />
              </Link>
              <Link
                href={secondaryHref}
                className={buttonClassName({ variant: "surface", size: "lg" })}
              >
                {t("ctaSecondary")}
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {(["latency", "uptime", "experiments"] as const).map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-border/70 bg-card/95 p-4 shadow-sm"
                >
                  <p className="text-sm text-muted-foreground">
                    {t(`stats.${item}.label`)}
                  </p>
                  <p className="text-2xl font-semibold tracking-tight">
                    {t(`stats.${item}.value`)}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <Card className="relative overflow-hidden border-border/70 bg-gradient-to-br from-card via-card to-secondary/60">
            <div
              aria-hidden
              className="pointer-events-none absolute right-6 top-6 h-16 w-16 rounded-full bg-primary/10 blur-2xl"
            />
            <CardHeader className="space-y-3">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" />
                {t("heroCard.title")}
              </div>
              <CardTitle className="text-2xl tracking-tight">
                {t("heroCard.subtitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(["signal", "guardrails", "playbooks"] as const).map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-border/70 bg-background/70 p-4"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    {t(`heroCard.${item}.eyebrow`)}
                  </p>
                  <p className="mt-2 text-base font-medium">
                    {t(`heroCard.${item}.title`)}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t(`heroCard.${item}.description`)}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <section className="space-y-8" data-layout-key="landing-features">
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {t("features.eyebrow")}
              </p>
              <h2 className="max-w-3xl text-3xl font-semibold tracking-tight md:text-4xl">
                {t("features.title")}
              </h2>
            </div>
            <p className="max-w-2xl text-muted-foreground">
              {t("features.subtitle")}
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            <Card className="border-border/70 bg-card/95 shadow-sm">
              <CardHeader className="space-y-3">
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
            <Card className="border-border/70 bg-card/95 shadow-sm">
              <CardHeader className="space-y-3">
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
            <Card className="border-border/70 bg-card/95 shadow-sm">
              <CardHeader className="space-y-3">
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

        <section
          className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]"
          data-layout-key="landing-timeline"
        >
          <Card className="border-border/70 bg-card/95 shadow-sm">
            <CardHeader>
              <CardTitle>{t("timeline.title")}</CardTitle>
              <CardDescription>{t("timeline.subtitle")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(["discover", "shape", "ship"] as const).map((item, index) => (
                <div key={item}>
                  <div className="space-y-2 rounded-2xl border border-border/60 bg-background/70 p-4">
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
                  {index < 2 ? <Separator className="mt-4" /> : null}
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="border-border/70 bg-secondary/45 shadow-sm">
            <CardHeader>
              <CardTitle>{t("signal.title")}</CardTitle>
              <CardDescription>{t("signal.subtitle")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(["drift", "guard", "launch"] as const).map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-border/60 bg-background/75 p-4"
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
