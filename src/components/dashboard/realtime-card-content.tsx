"use client";

import { useAtomValue, useSetAtom } from "jotai";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

import {
  ApiClientError,
  fetchDashboardMetrics,
} from "@/lib/runtime/api-client";
import {
  authSessionAtom,
  dashboardMetricsAtom,
  dashboardMetricsErrorAtom,
  dashboardMetricsLoadingAtom,
  dashboardRealtimeWsStatusAtom,
} from "@/lib/runtime/app-atoms";
import { subscribeRealtimeWs } from "@/lib/runtime/ws-client";

const refreshTypes = new Set(["sessions:changed", "notes:changed"] as const);

const statusLabelKeyMap = {
  connected: "realtime.ok",
  connecting: "realtime.connecting",
  disconnected: "realtime.off",
} as const;

const statusDetailKeyMap = {
  connected: "realtime.statusConnected",
  connecting: "realtime.statusConnecting",
  disconnected: "realtime.statusDisconnected",
} as const;

export function RealtimeCardContent() {
  const t = useTranslations("Dashboard");
  const sessionState = useAtomValue(authSessionAtom);
  const metrics = useAtomValue(dashboardMetricsAtom);
  const wsStatus = useAtomValue(dashboardRealtimeWsStatusAtom);
  const setMetrics = useSetAtom(dashboardMetricsAtom);
  const setLoading = useSetAtom(dashboardMetricsLoadingAtom);
  const setError = useSetAtom(dashboardMetricsErrorAtom);
  const setWsStatus = useSetAtom(dashboardRealtimeWsStatusAtom);
  const isAuthed = sessionState.kind === "authenticated";

  useEffect(() => {
    let closed = false;

    async function refreshMetrics({ silent }: { silent: boolean }) {
      if (!silent) {
        setLoading(true);
      }

      try {
        const next = await fetchDashboardMetrics();
        if (closed) {
          return;
        }

        setError(null);
        setMetrics(next);
      } catch (error) {
        if (closed) {
          return;
        }

        if (error instanceof ApiClientError && error.code === "unauthorized") {
          setMetrics(null);
          setWsStatus("disconnected");
          setError(null);
          return;
        }

        setError(error instanceof Error ? error.message : "metrics_failed");
      } finally {
        if (!silent && !closed) {
          setLoading(false);
        }
      }
    }

    if (!isAuthed) {
      setMetrics(null);
      setWsStatus("disconnected");
      setLoading(false);
      setError(null);
      return;
    }

    void refreshMetrics({ silent: false });

    const pollTimer = setInterval(() => {
      void refreshMetrics({ silent: true });
    }, 5_000);

    const unsubscribeWs = subscribeRealtimeWs({
      onStatus: setWsStatus,
      onEvent: (event) => {
        if (event.type === "hello" || refreshTypes.has(event.type)) {
          void refreshMetrics({ silent: true });
        }
      },
    });

    return () => {
      closed = true;
      clearInterval(pollTimer);
      unsubscribeWs();
    };
  }, [isAuthed, setError, setLoading, setMetrics, setWsStatus]);

  const shouldHideZeroMetricsWhileConnected =
    wsStatus === "connected" &&
    metrics?.realtime?.ok &&
    (metrics.realtime.usersConnected ?? 0) === 0 &&
    (metrics.realtime.connectionsTotal ?? 0) === 0;

  const metricsText = metrics?.realtime?.ok
    ? shouldHideZeroMetricsWhileConnected
      ? t("realtime.detailUnavailable")
      : t("realtime.detail", {
          users: String(metrics.realtime.usersConnected ?? 0),
          conns: String(metrics.realtime.connectionsTotal ?? 0),
        })
    : t("realtime.detailUnavailable");

  return (
    <>
      <p className="text-3xl font-semibold" data-testid="realtime-status-label">
        {t(statusLabelKeyMap[wsStatus])}
      </p>
      <p
        className="text-xs text-muted-foreground"
        data-testid="realtime-status-detail"
      >
        {t(statusDetailKeyMap[wsStatus])}
      </p>
      <p
        className="text-xs text-muted-foreground"
        data-testid="realtime-metrics-detail"
      >
        {metricsText}
      </p>
    </>
  );
}
