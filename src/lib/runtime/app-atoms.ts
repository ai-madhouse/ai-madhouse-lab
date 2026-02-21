"use client";

import { atom } from "jotai";
import type { z } from "zod";

import type { PulsePayload } from "@/lib/live/pulse-state";
import type { dashboardMetricsResponseSchema } from "@/lib/schemas/internal-api";

export type AuthSessionState =
  | { kind: "loading" }
  | { kind: "authenticated"; sessionId: string }
  | { kind: "unauthenticated" };

export type WsStatus = "connecting" | "connected" | "disconnected";

export type DashboardMetrics = z.infer<
  typeof dashboardMetricsResponseSchema
>["metrics"];

export const authSessionAtom = atom<AuthSessionState>({ kind: "loading" });

export const dashboardMetricsAtom = atom<DashboardMetrics | null>(null);
export const dashboardMetricsLoadingAtom = atom(false);
export const dashboardMetricsErrorAtom = atom<string | null>(null);

export const dashboardRealtimeWsStatusAtom = atom<WsStatus>("disconnected");

export const livePulseAtom = atom<PulsePayload | null>(null);
export const livePulseLoadingAtom = atom(false);
export const livePulseErrorAtom = atom<string | null>(null);

export const liveWsStatusAtom = atom<WsStatus>("disconnected");
