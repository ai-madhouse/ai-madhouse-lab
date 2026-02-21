import { atom } from "jotai";
import { z } from "zod";

import type { PulsePayload } from "@/lib/live/pulse-state";

const realtimeSchema = z
  .object({
    ok: z.literal(true),
    connectionsTotal: z.number().optional(),
    usersConnected: z.number().optional(),
  })
  .nullable();

const pulseSuccessSchema = z.object({
  ts: z.number(),
  activeSessions: z.number(),
  notesCount: z.number(),
  notesEventsLastHour: z.number(),
  notesEventsLastDay: z.number(),
  lastNotesActivityAt: z.string().nullable(),
  realtime: realtimeSchema,
});

const pulseSnapshotResponseSchema = z.object({
  ok: z.literal(true),
  pulse: pulseSuccessSchema,
});

export const livePulseAtom = atom<PulsePayload | null>(null);
export const livePulseErrorAtom = atom<string | null>(null);
export const livePulseLoadingAtom = atom(false);

export async function fetchPulseSnapshot() {
  const res = await fetch("/api/pulse/snapshot", { cache: "no-store" });
  const json = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      json && typeof json === "object" && "error" in json
        ? String((json as { error?: unknown }).error ?? "pulse_failed")
        : "pulse_failed";
    throw new Error(message);
  }

  const parsed = pulseSnapshotResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error("invalid_pulse_snapshot");
  }

  return parsed.data.pulse;
}
