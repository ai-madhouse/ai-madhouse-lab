import { redirect } from "next/navigation";
import { ChangePasswordForm } from "@/app/[locale]/settings/change-password-form";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Input } from "@/components/roiui/input";
import { NotesShortcutsSettings } from "@/components/settings/notes-shortcuts-settings";
import { SessionsListE2EE } from "@/components/settings/sessions-list-e2ee";
import { SignOutEverywhereDialog } from "@/components/settings/sign-out-everywhere-dialog";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  authenticate,
  clearAuthCookie,
  getSignedSessionIdFromCookies,
  isAuthenticated,
  verifyCsrfToken,
} from "@/lib/auth";
import { getMessages, normalizeLocale } from "@/lib/i18n";
import { consumeRateLimit } from "@/lib/rate-limit";
import { changePasswordFormSchema } from "@/lib/schemas/auth";
import {
  deleteOtherSessionsForUser,
  deleteSessionsForUser,
  getSession,
  listSessionsForUser,
} from "@/lib/sessions";
import { notifySessionsChanged } from "@/lib/sessions-notify";
import { createTranslator } from "@/lib/translator";
import { updateUserPassword } from "@/lib/users";

export default async function SettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ error?: string; pw?: string; tab?: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = normalizeLocale(rawLocale);
  const messages = await getMessages(locale);
  const t = createTranslator(messages, "Settings");
  const isAuthed = await isAuthenticated();

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const pageError = resolvedSearchParams?.error;
  const passwordOk = resolvedSearchParams?.pw === "ok";
  const selectedTab = normalizeSettingsTab(resolvedSearchParams?.tab);

  const sessionId = await getSignedSessionIdFromCookies();
  const session = sessionId ? await getSession(sessionId) : null;
  const sessions = session ? await listSessionsForUser(session.username) : [];

  async function revokeOtherSessionsAction() {
    "use server";

    const sid = await getSignedSessionIdFromCookies();
    if (!sid) redirect(`/${locale}/login`);

    const current = await getSession(sid);
    if (!current) {
      await clearAuthCookie();
      redirect(`/${locale}/login`);
    }

    await deleteOtherSessionsForUser({
      username: current.username,
      keepSessionId: sid,
    });
    await notifySessionsChanged({ username: current.username });

    redirect(`/${locale}/settings?tab=sessions`);
  }

  async function signOutEverywhereAction(_formData: FormData) {
    "use server";

    const sid = await getSignedSessionIdFromCookies();
    if (sid) {
      const current = await getSession(sid);
      if (current) {
        await deleteSessionsForUser(current.username);
        await notifySessionsChanged({ username: current.username });
      }
    }

    await clearAuthCookie();
    redirect(`/${locale}/login`);
  }

  async function changePasswordAction(formData: FormData) {
    "use server";

    const sid = await getSignedSessionIdFromCookies();
    if (!sid) redirect(`/${locale}/login`);

    const current = await getSession(sid);
    if (!current) {
      await clearAuthCookie();
      redirect(`/${locale}/login`);
    }

    const csrfToken = String(formData.get("csrfToken") ?? "");
    if (!(await verifyCsrfToken(csrfToken))) {
      redirect(`/${locale}/settings?tab=password&error=csrf`);
    }

    const limiter = consumeRateLimit({
      key: `pw-change:${current.username}`,
      limit: 10,
      windowSeconds: 60,
    });

    if (!limiter.ok) {
      redirect(`/${locale}/settings?tab=password&error=rate`);
    }

    const parsed = changePasswordFormSchema.safeParse({
      csrfToken,
      currentPassword: String(formData.get("currentPassword") ?? ""),
      newPassword: String(formData.get("newPassword") ?? ""),
      newPassword2: String(formData.get("newPassword2") ?? ""),
    });

    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "invalid";
      redirect(
        `/${locale}/settings?tab=password&error=${encodeURIComponent(msg)}`,
      );
    }

    const { currentPassword, newPassword } = parsed.data;

    if (!(await authenticate(current.username, currentPassword))) {
      redirect(`/${locale}/settings?tab=password&error=bad_current_password`);
    }

    await updateUserPassword({ username: current.username, newPassword });

    // Revoke other sessions (current stays valid).
    await deleteOtherSessionsForUser({
      username: current.username,
      keepSessionId: sid,
    });

    redirect(`/${locale}/settings?tab=password&pw=ok`);
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader isAuthed={isAuthed} />
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

          <Tabs
            labelledBy="settings-title"
            defaultValue={selectedTab}
            items={[
              {
                value: "password",
                label: t("password.title"),
                content: (
                  <Card>
                    <CardHeader>
                      <CardTitle>{t("password.title")}</CardTitle>
                      <CardDescription>
                        {t("password.subtitle")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {passwordOk ? (
                        <div className="rounded-xl border border-emerald-600/30 bg-emerald-600/10 p-3 text-sm text-emerald-700">
                          {t("password.ok")}
                        </div>
                      ) : null}

                      {pageError ? (
                        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                          {t("password.error", { error: pageError })}
                        </div>
                      ) : null}

                      <ChangePasswordForm
                        action={changePasswordAction}
                        title={t("password.hint")}
                        currentPasswordLabel={t("password.current")}
                        newPasswordLabel={t("password.new")}
                        confirmPasswordLabel={t("password.confirm")}
                        submitLabel={t("password.submit")}
                      />
                    </CardContent>
                  </Card>
                ),
              },
              {
                value: "sessions",
                label: t("sessions.title"),
                content: (
                  <Card>
                    <CardHeader>
                      <CardTitle>{t("sessions.title")}</CardTitle>
                      <CardDescription>
                        {t("sessions.subtitle")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        {t("sessions.active", {
                          count: String(sessions.length),
                        })}
                      </p>

                      <SessionsListE2EE currentSessionId={sessionId ?? null} />
                      <div className="flex flex-wrap gap-2">
                        <form action={revokeOtherSessionsAction}>
                          <Button
                            type="submit"
                            variant="outline"
                            disabled={!isAuthed}
                          >
                            {t("sessions.revokeOthers")}
                          </Button>
                        </form>
                        <SignOutEverywhereDialog
                          action={signOutEverywhereAction}
                          disabled={!isAuthed}
                          triggerLabel={t("sessions.signOutEverywhere")}
                          title={t("sessions.signOutEverywhereDialog.title")}
                          description={t(
                            "sessions.signOutEverywhereDialog.description",
                          )}
                          cancelLabel={t(
                            "sessions.signOutEverywhereDialog.cancel",
                          )}
                          confirmLabel={t(
                            "sessions.signOutEverywhereDialog.confirm",
                          )}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t("sessions.note")}
                      </p>
                    </CardContent>
                  </Card>
                ),
              },
              {
                value: "appearance",
                label: t("appearance.title"),
                content: (
                  <Card>
                    <CardHeader>
                      <CardTitle>{t("appearance.title")}</CardTitle>
                      <CardDescription>
                        {t("appearance.subtitle")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ThemeSwitcher />
                    </CardContent>
                  </Card>
                ),
              },
              {
                value: "language",
                label: t("language.title"),
                content: (
                  <Card>
                    <CardHeader>
                      <CardTitle>{t("language.title")}</CardTitle>
                      <CardDescription>
                        {t("language.subtitle")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <LocaleSwitcher />
                      <p className="text-sm text-muted-foreground">
                        {t("language.note")}
                      </p>
                    </CardContent>
                  </Card>
                ),
              },
              {
                value: "shortcuts",
                label: t("shortcuts.title"),
                content: (
                  <Card>
                    <CardHeader>
                      <CardTitle>{t("shortcuts.title")}</CardTitle>
                      <CardDescription>
                        {t("shortcuts.subtitle")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <NotesShortcutsSettings />
                    </CardContent>
                  </Card>
                ),
              },
            ]}
          />
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

type SettingsTab =
  | "password"
  | "sessions"
  | "appearance"
  | "language"
  | "shortcuts";

function normalizeSettingsTab(rawTab: string | undefined): SettingsTab {
  switch (rawTab) {
    case "password":
    case "sessions":
    case "appearance":
    case "language":
    case "shortcuts":
      return rawTab;
    default:
      return "password";
  }
}
