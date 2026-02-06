import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { ClearDerivedKekCacheOnMount } from "@/components/auth/clear-derived-kek-cache-on-mount";
import { ClearNotesHistoryOnMount } from "@/components/auth/clear-notes-history-on-mount";
import { RegisterForm } from "@/components/auth/register-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  clearAuthCookie,
  isAuthenticated,
  setAuthCookie,
  verifyCsrfToken,
} from "@/lib/auth";
import { getMessages, normalizeLocale } from "@/lib/i18n";
import { consumeRateLimit } from "@/lib/rate-limit";
import { safeNextPath } from "@/lib/redirects";
import { getClientIp } from "@/lib/request";
import { registerFormSchema } from "@/lib/schemas/auth";
import { createSession } from "@/lib/sessions";
import { createTranslator } from "@/lib/translator";
import { createUser } from "@/lib/users";

type RegisterPageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ error?: string; next?: string }>;
};

async function registerAction(formData: FormData) {
  "use server";

  const parsed = registerFormSchema.safeParse({
    locale: String(formData.get("locale") ?? "en"),
    next: String(formData.get("next") ?? ""),
    username: String(formData.get("username") ?? ""),
    password: String(formData.get("password") ?? ""),
    password2: String(formData.get("password2") ?? ""),
    csrfToken: String(formData.get("csrfToken") ?? ""),
  });

  if (!parsed.success) {
    const locale = normalizeLocale(String(formData.get("locale") ?? "en"));
    const msg = parsed.error.issues[0]?.message ?? "invalid";
    redirect(`/${locale}/register?error=${encodeURIComponent(msg)}`);
  }

  const { locale, next, username, csrfToken } = parsed.data;
  const password = String(formData.get("password") ?? "");

  const hdrs = await headers();
  const ip = getClientIp(hdrs);

  const nextPath = safeNextPath(locale, next);

  const limiter = consumeRateLimit({
    key: `register:${username || "unknown"}`,
    limit: 10,
    windowSeconds: 60,
  });

  if (!limiter.ok) {
    redirect(
      `/${locale}/register?error=rate&next=${encodeURIComponent(nextPath)}`,
    );
  }

  if (!(await verifyCsrfToken(csrfToken))) {
    redirect(
      `/${locale}/register?error=csrf&next=${encodeURIComponent(nextPath)}`,
    );
  }

  try {
    await createUser({ username, password });
  } catch {
    redirect(
      `/${locale}/register?error=exists&next=${encodeURIComponent(nextPath)}`,
    );
  }

  // Clear any existing cookie, then create a fresh session.
  await clearAuthCookie();

  const userAgent = hdrs.get("user-agent") ?? "";
  const session = await createSession({ username, ip, userAgent });
  await setAuthCookie(session.id);

  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      event: "user_registered",
      username,
      sessionId: session.id,
      ip,
      userAgent,
    }),
  );

  redirect(nextPath);
}

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
              action={registerAction}
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
