"use client";

import { useAtom } from "jotai";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { getRealtimeWsUrl } from "@/lib/realtime-url";
import {
  dashboardMetricsAtom,
  dashboardMetricsErrorAtom,
  dashboardMetricsLoadingAtom,
  dashboardWsStatusAtom,
  fetchDashboardMetrics,
} from "@/lib/runtime/dashboard-state";
import { safeParseJson } from "@/lib/utils";

const refreshTypes = new Set(["sessions:changed", "notes:changed"]);

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

export function RealtimeCardContent({ isAuthed }: { isAuthed: boolean }) {
  const t = useTranslations("Dashboard");

  const [metrics, setMetrics] = useAtom(dashboardMetricsAtom);
  const [, setLoading] = useAtom(dashboardMetricsLoadingAtom);
  const [, setError] = useAtom(dashboardMetricsErrorAtom);
  const [wsStatus, setWsStatus] = useAtom(dashboardWsStatusAtom);

  useEffect(() => {
    if (!isAuthed) {
      setMetrics(null);
      setWsStatus("disconnected");
      setLoading(false);
      setError(null);
      return;
    }

    let closed = false;

    async function refreshMetrics() {
      setLoading(true);
      try {
        const next = await fetchDashboardMetrics();
        if (closed) return;
        setError(null);
        setMetrics(next);
      } catch (err) {
        if (closed) return;
        setError(err instanceof Error ? err.message : "metrics_failed");
      } finally {
        if (!closed) setLoading(false);
      }
    }

    void refreshMetrics();

    const pollTimer = setInterval(() => {
      void refreshMetrics();
    }, 5_000);

    return () => {
      closed = true;
      clearInterval(pollTimer);
    };
  }, [isAuthed, setError, setLoading, setMetrics, setWsStatus]);

  useEffect(() => {
    if (!isAuthed) {
      setWsStatus("disconnected");
      return;
    }

    const url = getRealtimeWsUrl();
    if (!url) {
      setWsStatus("disconnected");
      return;
    }

    let closed = false;
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let retryMs = 1_500;

    async function refreshMetrics() {
      try {
        const next = await fetchDashboardMetrics();
        if (closed) return;
        setMetrics(next);
      } catch {
        // ignore refresh failures; polling handles retries
      }
    }

    function connect(wsUrl: string) {
      if (closed) return;
      setWsStatus("connecting");

      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        if (closed) return;
        retryMs = 1_500;
        setWsStatus("connected");
        void refreshMetrics();
      };

      ws.onclose = () => {
        if (closed) return;
        setWsStatus("disconnected");
        reconnectTimer = setTimeout(() => {
          retryMs = Math.min(retryMs * 2, 10_000);
          connect(wsUrl);
        }, retryMs);
      };

      ws.onmessage = (event) => {
        const data = safeParseJson<{ type?: string }>(String(event.data));
        if (!data?.type || !refreshTypes.has(data.type)) return;
        void refreshMetrics();
      };
    }

    connect(url);

    return () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      try {
        ws?.close();
      } catch {
        // ignore
      }
    };
  }, [isAuthed, setMetrics, setWsStatus]);

  const metricsText = metrics?.realtime?.ok
    ? t("realtime.detail", {
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
