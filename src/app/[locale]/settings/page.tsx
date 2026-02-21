import { Button } from "@/components/roiui/button";
import { Input } from "@/components/roiui/input";
import { SettingsRuntimePanel } from "@/components/settings/settings-runtime-panel";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getMessages, normalizeLocale } from "@/lib/i18n";
import { createTranslator } from "@/lib/translator";

type SettingsTab =
  | "password"
  | "sessions"
  | "appearance"
  | "language"
  | "shortcuts";

const settingsTabMap: Record<SettingsTab, SettingsTab> = {
  password: "password",
  sessions: "sessions",
  appearance: "appearance",
  language: "language",
  shortcuts: "shortcuts",
};

export default async function SettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ tab?: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = normalizeLocale(rawLocale);
  const messages = await getMessages(locale);
  const t = createTranslator(messages, "Settings");

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const selectedTab = normalizeSettingsTab(resolvedSearchParams?.tab);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-12">
        <section className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {t("eyebrow")}
          </p>
          <h1
            id="settings-title"
            className="text-3xl font-semibold md:text-4xl"
          >
            {t("title")}
          </h1>
          <p className="max-w-2xl text-muted-foreground">{t("subtitle")}</p>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle>{t("profile.title")}</CardTitle>
              <CardDescription>{t("profile.subtitle")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t("profile.name")}</Label>
                <Input id="name" placeholder={t("profile.namePlaceholder")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">{t("profile.role")}</Label>
                <Input id="role" placeholder={t("profile.rolePlaceholder")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="focus">{t("profile.focus")}</Label>
                <Textarea
                  id="focus"
                  placeholder={t("profile.focusPlaceholder")}
                />
              </div>
              <Button>{t("profile.save")}</Button>
            </CardContent>
          </Card>

          <SettingsRuntimePanel defaultTab={selectedTab} />
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function normalizeSettingsTab(rawTab: string | undefined): SettingsTab {
  if (!rawTab) return "password";
  return settingsTabMap[rawTab as SettingsTab] ?? "password";
}
