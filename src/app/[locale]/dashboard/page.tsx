import { DashboardRuntimePanel } from "@/components/dashboard/realtime-card-content";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
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

        <DashboardRuntimePanel locale={locale} />
      </main>
      <SiteFooter />
    </div>
  );
}
