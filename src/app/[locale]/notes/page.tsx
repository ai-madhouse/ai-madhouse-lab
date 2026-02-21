import { NotesBoard } from "@/components/notes/notes-board";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getMessages, normalizeLocale } from "@/lib/i18n";
import { createTranslator } from "@/lib/translator";

export default async function NotesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = normalizeLocale(rawLocale);
  const messages = await getMessages(locale);
  const t = createTranslator(messages, "Notes");

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-12">
        <section className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {t("eyebrow")}
          </p>
          <h1 className="text-3xl font-semibold md:text-4xl">{t("title")}</h1>
          <p className="max-w-2xl text-muted-foreground">{t("subtitle")}</p>
        </section>

        <NotesBoard />
      </main>
      <SiteFooter />
    </div>
  );
}
