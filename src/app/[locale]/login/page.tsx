import { redirect } from "next/navigation";
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
import { authenticate, isAuthenticated, setAuthCookie } from "@/lib/auth";
import { getMessages, normalizeLocale } from "@/lib/i18n";
import { createTranslator } from "@/lib/translator";

type LoginPageProps = {
  params: { locale: string };
  searchParams?: { error?: string; next?: string };
};

async function loginAction(formData: FormData) {
  "use server";
  const locale = normalizeLocale(String(formData.get("locale") ?? "en"));
  const nextPath = String(formData.get("next") ?? `/${locale}/dashboard`);
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!authenticate(username, password)) {
    redirect(`/${locale}/login?error=1&next=${encodeURIComponent(nextPath)}`);
  }

  setAuthCookie();
  redirect(nextPath);
}

export default async function LoginPage({
  params,
  searchParams,
}: LoginPageProps) {
  const locale = normalizeLocale(params.locale);
  const messages = await getMessages(locale);
  const t = createTranslator(messages, "Auth");
  const isAuthed = isAuthenticated();
  const hasError = searchParams?.error === "1";

  return (
    <div className="min-h-screen bg-background">
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
                <input type="hidden" name="locale" value={locale} />
                <input
                  type="hidden"
                  name="next"
                  value={searchParams?.next ?? `/${locale}/dashboard`}
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
