import { ClearDerivedKekCacheOnMount } from "@/components/auth/clear-derived-kek-cache-on-mount";
import { ClearNotesHistoryOnMount } from "@/components/auth/clear-notes-history-on-mount";
import { RegisterForm } from "@/components/auth/register-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { isAuthenticated } from "@/lib/auth";
import { getMessages, normalizeLocale } from "@/lib/i18n";
import { createTranslator } from "@/lib/translator";

type RegisterPageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ error?: string; next?: string }>;
};

export default async function RegisterPage({
  params,
  searchParams,
}: RegisterPageProps) {
  const { locale: rawLocale } = await params;
  const locale = normalizeLocale(rawLocale);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const messages = await getMessages(locale);
  const t = createTranslator(messages, "Auth");

  const isAuthed = await isAuthenticated();
  const err = resolvedSearchParams?.error;
  const nextPath = resolvedSearchParams?.next ?? `/${locale}/dashboard`;

  return (
    <div className="min-h-screen bg-background">
      <ClearDerivedKekCacheOnMount enabled={!isAuthed} />
      <ClearNotesHistoryOnMount enabled={!isAuthed} />
      <SiteHeader isAuthed={isAuthed} />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-12">
        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <Badge variant="secondary">{t("register.badge")}</Badge>
            <h1 className="text-3xl font-semibold md:text-4xl">
              {t("register.title")}
            </h1>
            <p className="text-muted-foreground">{t("register.subtitle")}</p>
            <div className="rounded-2xl border border-border/60 bg-card p-4 text-sm text-muted-foreground">
              {t("register.hint")}
            </div>
          </div>

          <Card>
            <RegisterForm
              action="/api/auth/register"
              locale={locale}
              nextPath={nextPath}
              error={err}
              errorText={t("register.form.error", { error: err ?? "" })}
              title={t("register.form.title")}
              subtitle={t("register.form.subtitle")}
              usernameLabel={t("register.form.username")}
              passwordLabel={t("register.form.password")}
              password2Label={t("register.form.password2")}
              submitLabel={t("register.form.submit")}
              haveAccountText={t("register.form.haveAccount")}
              signInText={t("register.form.signIn")}
            />
          </Card>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
