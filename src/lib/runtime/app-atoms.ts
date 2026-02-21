"use client";

import { atom } from "jotai";

import type { PulsePayload } from "@/lib/live/pulse-state";

export type AuthSessionState =
  | { kind: "loading" }
  | { kind: "authenticated"; sessionId: string }
  | { kind: "unauthenticated" };

export type WsStatus = "connecting" | "connected" | "disconnected";

export type DashboardMetrics = {
  activeSessions: number;
  notesCount: number;
  notesEventsLastHour: number;
  notesEventsLastDay: number;
  lastNotesActivityAt: string | null;
  realtime: {
    ok: true;
    connectionsTotal?: number;
    usersConnected?: number;
  } | null;
};

export const authSessionAtom = atom<AuthSessionState>({ kind: "loading" });

export const dashboardMetricsAtom = atom<DashboardMetrics | null>(null);

export const dashboardRealtimeWsStatusAtom = atom<WsStatus>("disconnected");

export const livePulseAtom = atom<PulsePayload | null>(null);

export const liveWsStatusAtom = atom<WsStatus>("disconnected");
