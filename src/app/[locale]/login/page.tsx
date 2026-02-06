import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { ClearDerivedKekCacheOnMount } from "@/components/auth/clear-derived-kek-cache-on-mount";
import { ClearNotesHistoryOnMount } from "@/components/auth/clear-notes-history-on-mount";
import { LoginForm } from "@/components/auth/login-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  authenticate,
  isAuthenticated,
  setAuthCookie,
  verifyCsrfToken,
} from "@/lib/auth";
import { getMessages, normalizeLocale } from "@/lib/i18n";
import { consumeRateLimit } from "@/lib/rate-limit";
import { safeNextPath } from "@/lib/redirects";
import { getClientIp } from "@/lib/request";
import { loginFormSchema } from "@/lib/schemas/auth";
import { createSession } from "@/lib/sessions";
import { createTranslator } from "@/lib/translator";

type LoginPageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ error?: string; next?: string }>;
};

async function loginAction(formData: FormData) {
  "use server";

  const parsed = loginFormSchema.safeParse({
    locale: String(formData.get("locale") ?? "en"),
    next: String(formData.get("next") ?? ""),
    username: String(formData.get("username") ?? ""),
    password: String(formData.get("password") ?? ""),
    csrfToken: String(formData.get("csrfToken") ?? ""),
  });

  // Generic error for invalid payload.
  if (!parsed.success) {
    const locale = normalizeLocale(String(formData.get("locale") ?? "en"));
    redirect(`/${locale}/login?error=1`);
  }

  const { locale, next, username, csrfToken } = parsed.data;
  const password = String(formData.get("password") ?? "");
  const nextPath = safeNextPath(locale, next);

  const hdrs = await headers();
  const ip = getClientIp(hdrs);

  const limiter = consumeRateLimit({
    key: `login:${username || "unknown"}`,
    limit: 10,
    windowSeconds: 60,
  });

  if (!limiter.ok) {
    redirect(
      `/${locale}/login?error=rate&next=${encodeURIComponent(nextPath)}`,
    );
  }

  if (!(await verifyCsrfToken(csrfToken))) {
    redirect(
      `/${locale}/login?error=csrf&next=${encodeURIComponent(nextPath)}`,
    );
  }

  if (!(await authenticate(username, password))) {
    redirect(`/${locale}/login?error=1&next=${encodeURIComponent(nextPath)}`);
  }

  const userAgent = hdrs.get("user-agent") ?? "";
  const session = await createSession({ username, ip, userAgent });

  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      event: "session_created",
      username,
      sessionId: session.id,
      expiresAt: session.expiresAt,
      ip,
      userAgent,
    }),
  );

  await setAuthCookie(session.id);
  redirect(nextPath);
}

export default async function LoginPage({
  params,
  searchParams,
}: LoginPageProps) {
  const { locale: rawLocale } = await params;
  const locale = normalizeLocale(rawLocale);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const messages = await getMessages(locale);
  const t = createTranslator(messages, "Auth");

  const isAuthed = await isAuthenticated();
  const hasError = resolvedSearchParams?.error === "1";
  const nextPath = resolvedSearchParams?.next ?? `/${locale}/dashboard`;

  return (
    <div className="min-h-screen bg-background">
      <ClearDerivedKekCacheOnMount enabled={!isAuthed} />
      <ClearNotesHistoryOnMount enabled={!isAuthed} />
      <SiteHeader isAuthed={isAuthed} />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-12">
        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <Badge variant="secondary">{t("badge")}</Badge>
            <h1 className="text-3xl font-semibold md:text-4xl">{t("title")}</h1>
            <p className="text-muted-foreground">{t("subtitle")}</p>
            <div className="rounded-2xl border border-border/60 bg-card p-4 text-sm text-muted-foreground">
              {t("hint")}
            </div>
          </div>

          <Card>
            <LoginForm
              action={loginAction}
              locale={locale}
              nextPath={nextPath}
              hasError={hasError}
              errorText={t("form.error")}
              title={t("form.title")}
              subtitle={t("form.subtitle")}
              usernameLabel={t("form.username")}
              usernamePlaceholder={t("form.usernamePlaceholder")}
              passwordLabel={t("form.password")}
              passwordPlaceholder={t("form.passwordPlaceholder")}
              submitLabel={t("form.submit")}
              noAccountText={t("form.noAccount")}
              registerLinkText={t("form.registerLink")}
            />
          </Card>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
