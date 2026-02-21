"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { getRealtimeWsUrl } from "@/lib/realtime-url";

type RealtimeHealth = {
  ok: true;
  connectionsTotal?: number;
  usersConnected?: number;
} | null;

type WsStatus = "connecting" | "connected" | "disconnected";

export function RealtimeCardContent({
  initialRealtime,
  isAuthed,
}: {
  initialRealtime: RealtimeHealth;
  isAuthed: boolean;
}) {
  const t = useTranslations("Dashboard");
  const [wsStatus, setWsStatus] = useState<WsStatus>(
    isAuthed ? "connecting" : "disconnected",
  );
  const [realtimeHealth, setRealtimeHealth] =
    useState<RealtimeHealth>(initialRealtime);

  useEffect(() => {
    if (!isAuthed) {
      setWsStatus("disconnected");
      setRealtimeHealth(null);
      return;
    }

    let closed = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    async function refreshRealtimeHealth() {
      try {
        const res = await fetch("/api/realtime/health", { cache: "no-store" });
        if (!res.ok) return;
        const payload = (await res.json().catch(() => null)) as {
          ok: true;
          connectionsTotal?: number;
          usersConnected?: number;
        } | null;
        if (!payload?.ok || closed) return;
        setRealtimeHealth({
          ok: true,
          connectionsTotal: Number(payload.connectionsTotal ?? 0),
          usersConnected: Number(payload.usersConnected ?? 0),
        });
      } catch {
        // ignore
      }
    }

    void refreshRealtimeHealth();
    pollTimer = setInterval(() => {
      void refreshRealtimeHealth();
    }, 5_000);

    const url = getRealtimeWsUrl();
    if (!url) {
      setWsStatus("disconnected");
      if (pollTimer) clearInterval(pollTimer);
      return;
    }

    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let retryMs = 1_500;

    function connect(wsUrl: string) {
      if (closed) return;
      setWsStatus("connecting");

      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        if (closed) return;
        retryMs = 1_500;
        setWsStatus("connected");
        void refreshRealtimeHealth();
      };

      ws.onclose = () => {
        if (closed) return;
        setWsStatus("disconnected");
        reconnectTimer = setTimeout(() => {
          retryMs = Math.min(retryMs * 2, 10_000);
          connect(wsUrl);
        }, retryMs);
      };

      ws.onerror = () => {
        if (closed) return;
        // `error` can fire before a follow-up `close`; avoid false negatives
        // and let `close` drive disconnected state.
      };
    }

    connect(url);

    return () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (pollTimer) clearInterval(pollTimer);
      try {
        ws?.close();
      } catch {
        // ignore
      }
    };
  }, [isAuthed]);

  const metricsText = realtimeHealth?.ok
    ? t("realtime.detail", {
        users: String(realtimeHealth.usersConnected ?? 0),
        conns: String(realtimeHealth.connectionsTotal ?? 0),
      })
    : t("realtime.detailUnavailable");

  const statusLabel =
    wsStatus === "connected"
      ? t("realtime.ok")
      : wsStatus === "connecting"
        ? t("realtime.connecting")
        : t("realtime.off");

  const statusDetail =
    wsStatus === "connected"
      ? t("realtime.statusConnected")
      : wsStatus === "connecting"
        ? t("realtime.statusConnecting")
        : t("realtime.statusDisconnected");

  return (
    <>
      <p className="text-3xl font-semibold" data-testid="realtime-status-label">
        {statusLabel}
      </p>
      <p
        className="text-xs text-muted-foreground"
        data-testid="realtime-status-detail"
      >
        {statusDetail}
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
