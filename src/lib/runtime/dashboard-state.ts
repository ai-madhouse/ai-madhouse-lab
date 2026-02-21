import { atom } from "jotai";
import { z } from "zod";

const realtimeSchema = z
  .object({
    ok: z.literal(true),
    connectionsTotal: z.number().optional(),
    usersConnected: z.number().optional(),
  })
  .nullable();

const dashboardMetricsSchema = z.object({
  activeSessions: z.number(),
  notesCount: z.number(),
  notesEventsLastHour: z.number(),
  notesEventsLastDay: z.number(),
  lastNotesActivityAt: z.string().nullable(),
  realtime: realtimeSchema,
});

const dashboardMetricsResponseSchema = z.object({
  ok: z.literal(true),
  metrics: dashboardMetricsSchema,
});

export type DashboardMetrics = z.infer<typeof dashboardMetricsSchema>;
export type DashboardWsStatus = "connecting" | "connected" | "disconnected";

export const dashboardMetricsAtom = atom<DashboardMetrics | null>(null);
export const dashboardMetricsLoadingAtom = atom(false);
export const dashboardMetricsErrorAtom = atom<string | null>(null);
export const dashboardWsStatusAtom = atom<DashboardWsStatus>("disconnected");

export async function fetchDashboardMetrics() {
  const res = await fetch("/api/dashboard/metrics", { cache: "no-store" });
  const json = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      json && typeof json === "object" && "error" in json
        ? String((json as { error?: unknown }).error ?? "metrics_failed")
        : "metrics_failed";
    throw new Error(message);
  }

  const parsed = dashboardMetricsResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error("invalid_metrics_response");
  }

  return parsed.data.metrics;
}
