import Link from "next/link";

import { PulseBoard } from "@/components/live/pulse-board";
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
import { isAuthenticated } from "@/lib/auth";
import { getMessages, normalizeLocale } from "@/lib/i18n";
import { createTranslator } from "@/lib/translator";

export default async function LivePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = normalizeLocale(rawLocale);
  const messages = await getMessages(locale);
  const t = createTranslator(messages, "Live");
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

        <PulseBoard />

        <Card>
          <CardHeader>
            <CardTitle>{t("help.title")}</CardTitle>
            <CardDescription>{t("help.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>{t("help.pointOne")}</p>
            <p>{t("help.pointTwo")}</p>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/${locale}/notes`}
                className={buttonClassName({ variant: "outline", size: "sm" })}
              >
                {t("help.openNotes")}
              </Link>
              <Link
                href={`/${locale}/settings`}
                className={buttonClassName({ variant: "outline", size: "sm" })}
              >
                {t("help.openSettings")}
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
      <SiteFooter />
    </div>
  );
}
