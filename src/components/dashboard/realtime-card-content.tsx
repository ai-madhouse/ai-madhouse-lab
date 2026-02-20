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

    function connect(wsUrl: string) {
      if (closed) return;
      setWsStatus("connecting");

      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        if (closed) return;
        retryMs = 1_500;
        setWsStatus("connected");
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
        setWsStatus("disconnected");
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
  }, [isAuthed]);

  const metricsText = initialRealtime?.ok
    ? t("realtime.detail", {
        users: String(initialRealtime.usersConnected ?? 0),
        conns: String(initialRealtime.connectionsTotal ?? 0),
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
      <p className="text-xs text-muted-foreground">{metricsText}</p>
    </>
  );
}
