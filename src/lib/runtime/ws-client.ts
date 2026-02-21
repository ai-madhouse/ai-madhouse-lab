"use client";

import { getRealtimeWsUrl } from "@/lib/realtime-url";
import {
  realtimeWsHelloSchema,
  realtimeWsNotesChangedSchema,
  realtimeWsSessionsChangedSchema,
} from "@/lib/schemas/internal-api";
import { safeParseJson } from "@/lib/utils";

export type RealtimeWsEvent =
  | { type: "hello" }
  | { type: "sessions:changed" }
  | { type: "notes:changed" };

function parseRealtimeEvent(raw: string): RealtimeWsEvent | null {
  const parsed = safeParseJson<unknown>(raw);
  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  const schemas = [
    realtimeWsHelloSchema,
    realtimeWsSessionsChangedSchema,
    realtimeWsNotesChangedSchema,
  ] as const;

  for (const schema of schemas) {
    const result = schema.safeParse(parsed);
    if (result.success) {
      return result.data;
    }
  }

  return null;
}

/**
 * Subscribe to realtime WS messages with retry-on-close semantics.
 */
export function subscribeRealtimeWs({
  onEvent,
  onStatus,
}: {
  onEvent: (event: RealtimeWsEvent) => void;
  onStatus: (status: "connecting" | "connected" | "disconnected") => void;
}) {
  const wsUrl = getRealtimeWsUrl();
  if (!wsUrl) {
    onStatus("disconnected");
    return () => {};
  }
  const url = wsUrl;

  let closed = false;
  let ws: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let retryMs = 1_500;

  function connect() {
    if (closed) {
      return;
    }

    onStatus("connecting");
    ws = new WebSocket(url);

    ws.onopen = () => {
      if (closed) {
        return;
      }

      retryMs = 1_500;
      onStatus("connected");
    };

    ws.onmessage = (event) => {
      if (closed) {
        return;
      }

      const message = parseRealtimeEvent(String(event.data));
      if (!message) {
        return;
      }

      onEvent(message);
    };

    ws.onclose = () => {
      if (closed) {
        return;
      }

      onStatus("disconnected");
      reconnectTimer = setTimeout(() => {
        retryMs = Math.min(retryMs * 2, 10_000);
        connect();
      }, retryMs);
    };

    ws.onerror = () => {
      // No-op: onclose is the source of disconnected state.
    };
  }

  connect();

  return () => {
    closed = true;

    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
    }

    try {
      ws?.close();
    } catch {
      // ignore
    }
  };
}
