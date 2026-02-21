"use client";

import { useAtomValue, useSetAtom } from "jotai";
import { Activity, FileText, ShieldCheck, Signal, Users } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { buttonClassName } from "@/components/roiui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ApiClientError,
  fetchCsrfToken,
  fetchDashboardMetrics,
  fetchSessionMe,
  revokeOtherSessions,
  signOutEverywhere,
} from "@/lib/runtime/api-client";
import {
  authSessionAtom,
  dashboardMetricsAtom,
  dashboardRealtimeWsStatusAtom,
} from "@/lib/runtime/app-atoms";
import { subscribeRealtimeWs } from "@/lib/runtime/ws-client";

const actionErrorKeyMap: Record<string, string> = {
  csrf: "csrf",
  rate: "rate",
  unauthorized: "unauthorized",
};

function formatActionError(code: string) {
  return actionErrorKeyMap[code] ?? code;
}

export function DashboardRuntimePanel({ locale }: { locale: string }) {
  const t = useTranslations("Dashboard");

  const sessionState = useAtomValue(authSessionAtom);
  const metrics = useAtomValue(dashboardMetricsAtom);
  const wsStatus = useAtomValue(dashboardRealtimeWsStatusAtom);

  const setSessionState = useSetAtom(authSessionAtom);
  const setMetrics = useSetAtom(dashboardMetricsAtom);
  const setWsStatus = useSetAtom(dashboardRealtimeWsStatusAtom);

  const [banner, setBanner] = useState<
    { kind: "ok"; value: string } | { kind: "error"; value: string } | null
  >(null);

  const csrfTokenRef = useRef<string | null>(null);
  const refreshingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      try {
        const session = await fetchSessionMe();
        if (!cancelled) {
          setSessionState({
            kind: "authenticated",
            sessionId: session.sessionId,
          });
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        if (error instanceof ApiClientError && error.code === "unauthorized") {
          setSessionState({ kind: "unauthenticated" });
          setMetrics(null);
          setWsStatus("disconnected");
          return;
        }

        setSessionState({ kind: "unauthenticated" });
        setMetrics(null);
        setWsStatus("disconnected");
        return;
      }

      try {
        const nextMetrics = await fetchDashboardMetrics();
        if (!cancelled) {
          setMetrics(nextMetrics);
        }
      } catch {
        if (!cancelled) {
          setMetrics(null);
        }
      }
    }

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, [setMetrics, setSessionState, setWsStatus]);

  useEffect(() => {
    if (sessionState.kind !== "authenticated") {
      setWsStatus("disconnected");
      return;
    }

    async function refreshFromApi() {
      if (refreshingRef.current) {
        return;
      }

      refreshingRef.current = true;
      try {
        const nextMetrics = await fetchDashboardMetrics();
        setMetrics(nextMetrics);
      } catch {
        // keep last known value
      } finally {
        refreshingRef.current = false;
      }
    }

    const unsubscribe = subscribeRealtimeWs({
      onStatus: (status) => {
        setWsStatus(status);
      },
      onEvent: (event) => {
        if (event.type === "hello") {
          void refreshFromApi();
          return;
        }

        if (
          event.type === "sessions:changed" ||
          event.type === "notes:changed"
        ) {
          void refreshFromApi();
        }
      },
    });

    return unsubscribe;
  }, [sessionState.kind, setMetrics, setWsStatus]);

  async function ensureCsrfToken() {
    if (csrfTokenRef.current) {
      return csrfTokenRef.current;
    }

    const res = await fetchCsrfToken();
    csrfTokenRef.current = res.token;
    return res.token;
  }

  async function handleRevokeOtherSessions() {
    setBanner(null);

    try {
      const token = await ensureCsrfToken();
      await revokeOtherSessions(token);
      const nextMetrics = await fetchDashboardMetrics();
      setMetrics(nextMetrics);
      setBanner({ kind: "ok", value: "revoke" });
    } catch (error) {
      const code =
        error instanceof ApiClientError
          ? formatActionError(error.code)
          : "request_failed";
      setBanner({ kind: "error", value: code });
    }
  }

  async function handleSignOutEverywhere() {
    setBanner(null);

    try {
      const token = await ensureCsrfToken();
      await signOutEverywhere(token);
      setSessionState({ kind: "unauthenticated" });
      window.location.href = `/${locale}/login`;
    } catch (error) {
      const code =
        error instanceof ApiClientError
          ? formatActionError(error.code)
          : "request_failed";
      setBanner({ kind: "error", value: code });
    }
  }

  const isAuthed = sessionState.kind === "authenticated";

  const metricsText = metrics?.realtime?.ok
    ? t("realtime.detail", {
        users: String(metrics.realtime.usersConnected ?? 0),
        conns: String(metrics.realtime.connectionsTotal ?? 0),
      })
    : t("realtime.detailUnavailable");

  const wsLabelByStatus: Record<typeof wsStatus, string> = {
    connected: t("realtime.ok"),
    connecting: t("realtime.connecting"),
    disconnected: t("realtime.off"),
  };

  const wsDetailByStatus: Record<typeof wsStatus, string> = {
    connected: t("realtime.statusConnected"),
    connecting: t("realtime.statusConnecting"),
    disconnected: t("realtime.statusDisconnected"),
  };

  return (
    <>
      {banner?.kind === "ok" ? (
        <div className="rounded-xl border border-emerald-600/30 bg-emerald-600/10 p-3 text-sm text-emerald-700">
          {t("status.ok", { ok: banner.value })}
        </div>
      ) : null}

      {banner?.kind === "error" ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {t("status.error", { error: banner.value })}
        </div>
      ) : null}

      <section
        className="grid gap-6 md:grid-cols-4"
        data-layout-key="dashboard-metrics"
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("cards.sessions.label")}
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <CardDescription>{t("cards.sessions.note")}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {metrics ? metrics.activeSessions : "–"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("cards.notes.label")}
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
            <CardDescription>{t("cards.notes.note")}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {metrics ? metrics.notesCount : "–"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("cards.activity.label")}
              </CardTitle>
              <Signal className="h-4 w-4 text-muted-foreground" />
            </div>
            <CardDescription>{t("cards.activity.note")}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {metrics ? metrics.notesEventsLastDay : "–"}
            </p>
          </CardContent>
        </Card>

        <Card data-testid="dashboard-realtime-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("cards.realtime.label")}
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
            <CardDescription>{t("cards.realtime.note")}</CardDescription>
          </CardHeader>
          <CardContent>
            <p
              className="text-3xl font-semibold"
              data-testid="realtime-status-label"
            >
              {wsLabelByStatus[wsStatus]}
            </p>
            <p
              className="text-xs text-muted-foreground"
              data-testid="realtime-status-detail"
            >
              {wsDetailByStatus[wsStatus]}
            </p>
            <p
              className="text-xs text-muted-foreground"
              data-testid="realtime-metrics-detail"
            >
              {metricsText}
            </p>
          </CardContent>
        </Card>
      </section>

      <section
        className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]"
        data-layout-key="dashboard-actions"
      >
        <Card>
          <CardHeader>
            <CardTitle>{t("next.title")}</CardTitle>
            <CardDescription>{t("next.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Link href={`/${locale}/notes`} className={buttonClassName({})}>
              {t("next.notes")}
            </Link>
            <Link
              href={`/${locale}/live`}
              className={buttonClassName({ variant: "outline" })}
            >
              {t("next.live")}
            </Link>
            <Link
              href={`/${locale}/settings`}
              className={buttonClassName({ variant: "outline" })}
            >
              {t("next.settings")}
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-secondary/40">
          <CardHeader>
            <CardTitle>{t("security.title")}</CardTitle>
            <CardDescription>{t("security.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl border border-border/60 bg-background p-4">
              <p className="text-sm font-medium">{t("security.csp.title")}</p>
              <p className="text-sm text-muted-foreground">
                {t("security.csp.description")}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={buttonClassName({
                  variant: "outline",
                  size: "sm",
                })}
                disabled={!isAuthed}
                onClick={handleRevokeOtherSessions}
              >
                {t("security.actions.revokeOthers")}
              </button>

              <button
                type="button"
                className={buttonClassName({
                  variant: "destructive",
                  size: "sm",
                })}
                disabled={!isAuthed}
                onClick={handleSignOutEverywhere}
              >
                {t("security.actions.signOutEverywhere")}
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              <ShieldCheck className="mr-2 inline h-4 w-4" />
              {t("security.footer")}
            </p>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
