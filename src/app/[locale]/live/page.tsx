import { PulseBoard } from "@/components/live/pulse-board";
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

export default async function LivePage({
  params,
}: {
  params: { locale: string };
}) {
  const locale = normalizeLocale(params.locale);
  const messages = await getMessages(locale);
  const t = createTranslator(messages, "Live");
  const isAuthed = isAuthenticated();

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

        <PulseBoard />

        <Card>
          <CardHeader>
            <CardTitle>{t("notes.title")}</CardTitle>
            <CardDescription>{t("notes.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>{t("notes.pointOne")}</p>
            <p>{t("notes.pointTwo")}</p>
          </CardContent>
        </Card>
      </main>
      <SiteFooter />
    </div>
  );
}
