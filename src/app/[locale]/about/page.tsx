import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isAuthenticated } from "@/lib/auth";
import { getMessages, normalizeLocale } from "@/lib/i18n";
import { createTranslator } from "@/lib/translator";

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = normalizeLocale(rawLocale);
  const messages = await getMessages(locale);
  const t = createTranslator(messages, "About");
  const isAuthed = await isAuthenticated();

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader isAuthed={isAuthed} />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-12">
        <section className="space-y-4">
          <Badge variant="secondary">{t("badge")}</Badge>
          <h1 className="text-3xl font-semibold md:text-4xl">{t("title")}</h1>
          <p className="max-w-2xl text-muted-foreground">{t("subtitle")}</p>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("cards.stack.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>{t("cards.stack.pointOne")}</p>
              <p>{t("cards.stack.pointTwo")}</p>
              <p>{t("cards.stack.pointThree")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("cards.rules.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>{t("cards.rules.pointOne")}</p>
              <p>{t("cards.rules.pointTwo")}</p>
              <p>{t("cards.rules.pointThree")}</p>
            </CardContent>
          </Card>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
