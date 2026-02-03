import { Activity, LineChart, Rocket, ShieldCheck } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { isAuthenticated } from "@/lib/auth";
import { getMessages, normalizeLocale } from "@/lib/i18n";
import { createTranslator } from "@/lib/translator";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = normalizeLocale(rawLocale);
  const messages = await getMessages(locale);
  const t = createTranslator(messages, "Dashboard");
  const isAuthed = await isAuthenticated();

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

        <section className="grid gap-6 md:grid-cols-4">
          {[
            { key: "experiments", icon: Rocket },
            { key: "health", icon: Activity },
            { key: "coverage", icon: LineChart },
            { key: "guardrails", icon: ShieldCheck },
          ].map((metric) => {
            const Icon = metric.icon;
            return (
              <Card key={metric.key}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {t(`metrics.${metric.key}.label`)}
                    </CardTitle>
                    <Icon
                      className="h-4 w-4 text-muted-foreground"
                      aria-label={t(`metrics.${metric.key}.icon`)}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">
                    {t(`metrics.${metric.key}.value`)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t(`metrics.${metric.key}.note`)}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle>{t("activity.title")}</CardTitle>
              <CardDescription>{t("activity.subtitle")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {["batch", "alert", "review", "handoff"].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-border/60 bg-card/60 p-4"
                >
                  <p className="text-sm font-medium">
                    {t(`activity.items.${item}.title`)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t(`activity.items.${item}.description`)}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="bg-secondary/40">
            <CardHeader>
              <CardTitle>{t("ops.title")}</CardTitle>
              <CardDescription>{t("ops.subtitle")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {["readiness", "handover", "next"].map((item) => (
                <div key={item} className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    {t(`ops.${item}.eyebrow`)}
                  </p>
                  <p className="text-base font-medium">
                    {t(`ops.${item}.title`)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t(`ops.${item}.description`)}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
