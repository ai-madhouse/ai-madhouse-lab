import { headers } from "next/headers";
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
  authenticate,
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

type LoginPageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ error?: string; next?: string }>;
};

async function loginAction(formData: FormData) {
  "use server";
  const locale = normalizeLocale(String(formData.get("locale") ?? "en"));
  const nextPath = safeNextPath(locale, String(formData.get("next") ?? ""));
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  const csrfToken = String(formData.get("csrfToken") ?? "");

  // Rate limit attempts per IP.
  const hdrs = await headers();
  const ip = getClientIp(hdrs);
  const limiter = consumeRateLimit({
    key: `login:${ip}`,
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

  if (!authenticate(username, password)) {
    redirect(`/${locale}/login?error=1&next=${encodeURIComponent(nextPath)}`);
  }

  const userAgent = (await headers()).get("user-agent") ?? "";
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

  return (
    <div className="min-h-screen bg-background">
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
            <CardHeader>
              <CardTitle>{t("form.title")}</CardTitle>
              <CardDescription>{t("form.subtitle")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {hasError ? (
                <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  {t("form.error")}
                </div>
              ) : null}
              <form action={loginAction} className="space-y-4">
                <CsrfTokenField />
                <input type="hidden" name="locale" value={locale} />
                <input
                  type="hidden"
                  name="next"
                  value={resolvedSearchParams?.next ?? `/${locale}/dashboard`}
                />
                <div className="space-y-2">
                  <Label htmlFor="username">{t("form.username")}</Label>
                  <Input
                    id="username"
                    name="username"
                    placeholder={t("form.usernamePlaceholder")}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">{t("form.password")}</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder={t("form.passwordPlaceholder")}
                    required
                  />
                </div>
                <Button className="w-full">{t("form.submit")}</Button>
              </form>
            </CardContent>
          </Card>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
