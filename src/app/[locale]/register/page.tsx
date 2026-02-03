import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ClearNotesHistoryOnMount } from "@/components/auth/clear-notes-history-on-mount";
import { CsrfTokenField } from "@/components/csrf/csrf-token-field";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { createSession } from "@/lib/sessions";
import { createTranslator } from "@/lib/translator";
import {
  createUser,
  normalizeUsername,
  validatePassword,
  validateUsername,
} from "@/lib/users";

type RegisterPageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ error?: string; next?: string }>;
};

async function registerAction(formData: FormData) {
  "use server";

  const locale = normalizeLocale(String(formData.get("locale") ?? "en"));
  const nextPath = safeNextPath(locale, String(formData.get("next") ?? ""));

  const usernameRaw = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  const password2 = String(formData.get("password2") ?? "");
  const csrfToken = String(formData.get("csrfToken") ?? "");

  const hdrs = await headers();
  const ip = getClientIp(hdrs);

  const limiter = consumeRateLimit({
    key: `register:${ip}`,
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

  const username = normalizeUsername(usernameRaw);

  const usernameError = validateUsername(username);
  if (usernameError) {
    redirect(
      `/${locale}/register?error=${encodeURIComponent(usernameError)}&next=${encodeURIComponent(nextPath)}`,
    );
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    redirect(
      `/${locale}/register?error=${encodeURIComponent(passwordError)}&next=${encodeURIComponent(nextPath)}`,
    );
  }

  if (password !== password2) {
    redirect(
      `/${locale}/register?error=passwords_mismatch&next=${encodeURIComponent(nextPath)}`,
    );
  }

  try {
    await createUser({ username, password });
  } catch {
    // Probably username already exists.
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

  return (
    <div className="min-h-screen bg-background">
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
            <CardHeader>
              <CardTitle>{t("register.form.title")}</CardTitle>
              <CardDescription>{t("register.form.subtitle")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {err ? (
                <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  {t("register.form.error", { error: err })}
                </div>
              ) : null}

              <form action={registerAction} className="space-y-4">
                <CsrfTokenField />
                <input type="hidden" name="locale" value={locale} />
                <input
                  type="hidden"
                  name="next"
                  value={resolvedSearchParams?.next ?? `/${locale}/dashboard`}
                />

                <div className="space-y-2">
                  <Label htmlFor="username">
                    {t("register.form.username")}
                  </Label>
                  <Input
                    id="username"
                    name="username"
                    autoComplete="username"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">
                    {t("register.form.password")}
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password2">
                    {t("register.form.password2")}
                  </Label>
                  <Input
                    id="password2"
                    name="password2"
                    type="password"
                    autoComplete="new-password"
                    required
                  />
                </div>

                <Button className="w-full">{t("register.form.submit")}</Button>

                <p className="text-sm text-muted-foreground">
                  {t("register.form.haveAccount")}{" "}
                  <Link
                    href={`/${locale}/login?next=${encodeURIComponent(resolvedSearchParams?.next ?? `/${locale}/dashboard`)}`}
                    className="underline"
                  >
                    {t("register.form.signIn")}
                  </Link>
                </p>
              </form>
            </CardContent>
          </Card>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
