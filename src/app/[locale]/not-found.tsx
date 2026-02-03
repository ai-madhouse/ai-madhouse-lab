import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { getMessages, normalizeLocale } from "@/lib/i18n";
import { createTranslator } from "@/lib/translator";

const primaryLinkClasses =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

const outlineLinkClasses =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full border border-input bg-background px-4 text-sm font-medium transition hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export default async function NotFoundPage({
  params,
}: {
  params?: Promise<{ locale?: string }>;
}) {
  const resolved = params ? await params.catch(() => null) : null;
  const locale = normalizeLocale(
    resolved && typeof resolved.locale === "string" ? resolved.locale : null,
  );
  const messages = await getMessages(locale);
  const t = createTranslator(messages, "NotFound");

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-12">
        <section className="space-y-6">
          <Badge variant="secondary">{t("badge")}</Badge>
          <h1 className="text-3xl font-semibold md:text-4xl">{t("title")}</h1>
          <p className="max-w-2xl text-muted-foreground">{t("subtitle")}</p>
          <div className="flex flex-wrap gap-3">
            <Link href={`/${locale}`} className={primaryLinkClasses}>
              {t("backHome")}
            </Link>
            <Link href={`/${locale}/dashboard`} className={outlineLinkClasses}>
              {t("backDashboard")}
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
