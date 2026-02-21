"use client";

import { useAtomValue } from "jotai";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { PasswordRequirements } from "@/components/auth/password-requirements";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Button } from "@/components/roiui/button";
import { Input } from "@/components/roiui/input";
import { NotesShortcutsSettings } from "@/components/settings/notes-shortcuts-settings";
import { SessionsListE2EE } from "@/components/settings/sessions-list-e2ee";
import { SignOutEverywhereDialog } from "@/components/settings/sign-out-everywhere-dialog";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchCsrfTokenOrThrow } from "@/lib/client/csrf";
import { ApiClientError, fetchCsrfToken } from "@/lib/runtime/api-client";
import {
  settingsAuthAtom,
  settingsSessionsCountAtom,
} from "@/lib/runtime/settings-state";
import { changePasswordFormSchema } from "@/lib/schemas/auth";

type SettingsTab =
  | "password"
  | "sessions"
  | "appearance"
  | "language"
  | "shortcuts";

export function SettingsRuntimePanel({
  defaultTab,
}: {
  defaultTab: SettingsTab;
}) {
  const t = useTranslations("Settings");
  const locale = useLocale();
  const authState = useAtomValue(settingsAuthAtom);
  const sessionsCount = useAtomValue(settingsSessionsCountAtom);
  const isAuthed = authState.kind === "authenticated";

  const [sessionsBusy, setSessionsBusy] = useState<"revoke" | "signout" | null>(
    null,
  );

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordOk, setPasswordOk] = useState(false);

  async function callSettingsAction(
    pathname: string,
    kind: "revoke" | "signout",
  ) {
    if (!isAuthed || sessionsBusy !== null) return;

    setSessionsBusy(kind);
    try {
      const { token: csrfToken } = await fetchCsrfToken();
      const response = await fetch(pathname, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: "{}",
      });

      if (!response.ok) {
        throw new Error("sessions_action_failed");
      }

      if (kind === "signout") {
        window.location.href = `/${locale}/login`;
      }
    } catch (error) {
      if (error instanceof ApiClientError && error.code === "unauthorized") {
        window.location.href = `/${locale}/login`;
      }
    } finally {
      setSessionsBusy(null);
    }
  }

  async function submitChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (passwordBusy) return;

    setPasswordError(null);
    setPasswordOk(false);

    const csrfToken = await fetchCsrfTokenOrThrow("csrf");
    const parsed = changePasswordFormSchema.safeParse({
      csrfToken,
      currentPassword,
      newPassword,
      newPassword2,
    });

    if (!parsed.success) {
      const issue = parsed.error.issues[0]?.message ?? "invalid";
      setPasswordError(issue);
      return;
    }

    setPasswordBusy(true);
    try {
      const response = await fetch("/api/settings/change-password", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(parsed.data),
      });

      const json = (await response.json().catch(() => null)) as
        | { ok: true }
        | { ok: false; error?: string }
        | null;

      if (!response.ok || !json || !json.ok) {
        throw new Error(
          (json && "error" in json && json.error) || "password_failed",
        );
      }

      setCurrentPassword("");
      setNewPassword("");
      setNewPassword2("");
      setPasswordOk(true);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "password_failed");
    } finally {
      setPasswordBusy(false);
    }
  }

  return (
    <Tabs defaultValue={defaultTab}>
      <TabsList aria-labelledby="settings-title">
        <TabsTrigger value="password">{t("password.title")}</TabsTrigger>
        <TabsTrigger value="sessions">{t("sessions.title")}</TabsTrigger>
        <TabsTrigger value="appearance">{t("appearance.title")}</TabsTrigger>
        <TabsTrigger value="language">{t("language.title")}</TabsTrigger>
        <TabsTrigger value="shortcuts">{t("shortcuts.title")}</TabsTrigger>
      </TabsList>

      <TabsContent value="password">
        <Card>
          <CardHeader>
            <CardTitle>{t("password.title")}</CardTitle>
            <CardDescription>{t("password.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {passwordOk ? (
              <div className="rounded-xl border border-emerald-600/30 bg-emerald-600/10 p-3 text-sm text-emerald-700">
                {t("password.ok")}
              </div>
            ) : null}

            {passwordError ? (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {t("password.error", { error: passwordError })}
              </div>
            ) : null}

            <form className="space-y-4" onSubmit={submitChangePassword}>
              <div className="space-y-2">
                <Label htmlFor="currentPassword">{t("password.current")}</Label>
                <Input
                  id="currentPassword"
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  required
                  disabled={passwordBusy}
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">{t("password.new")}</Label>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  disabled={passwordBusy}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
                <PasswordRequirements password={newPassword} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword2">{t("password.confirm")}</Label>
                <Input
                  id="newPassword2"
                  name="newPassword2"
                  type="password"
                  autoComplete="new-password"
                  required
                  disabled={passwordBusy}
                  value={newPassword2}
                  onChange={(event) => setNewPassword2(event.target.value)}
                />
              </div>

              <Button type="submit" disabled={passwordBusy}>
                {t("password.submit")}
              </Button>

              <p className="text-xs text-muted-foreground">
                {t("password.hint")}
              </p>
            </form>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="sessions">
        <Card>
          <CardHeader>
            <CardTitle>{t("sessions.title")}</CardTitle>
            <CardDescription>{t("sessions.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("sessions.active", {
                count: String(sessionsCount),
              })}
            </p>

            <SessionsListE2EE />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={!isAuthed || sessionsBusy !== null}
                onClick={() => {
                  void callSettingsAction(
                    "/api/settings/revoke-other-sessions",
                    "revoke",
                  );
                }}
              >
                {t("sessions.revokeOthers")}
              </Button>
              <SignOutEverywhereDialog
                onConfirm={() =>
                  callSettingsAction(
                    "/api/settings/signout-everywhere",
                    "signout",
                  )
                }
                disabled={!isAuthed || sessionsBusy !== null}
                triggerLabel={t("sessions.signOutEverywhere")}
                title={t("sessions.signOutEverywhereDialog.title")}
                description={t("sessions.signOutEverywhereDialog.description")}
                cancelLabel={t("sessions.signOutEverywhereDialog.cancel")}
                confirmLabel={t("sessions.signOutEverywhereDialog.confirm")}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {t("sessions.note")}
            </p>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="appearance">
        <Card>
          <CardHeader>
            <CardTitle>{t("appearance.title")}</CardTitle>
            <CardDescription>{t("appearance.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ThemeSwitcher />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="language">
        <Card>
          <CardHeader>
            <CardTitle>{t("language.title")}</CardTitle>
            <CardDescription>{t("language.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <LocaleSwitcher />
            <p className="text-sm text-muted-foreground">
              {t("language.note")}
            </p>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="shortcuts">
        <Card>
          <CardHeader>
            <CardTitle>{t("shortcuts.title")}</CardTitle>
            <CardDescription>{t("shortcuts.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            <NotesShortcutsSettings />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
