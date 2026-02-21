export type PulsePayload =
  | {
      ts: number;
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
      error?: undefined;
    }
  | { ts: number; error: string };

export type PulseSuccessPayload = Extract<PulsePayload, { error?: undefined }>;

export function isPulseErrorState(pulse: PulsePayload | null) {
  return Boolean(pulse && "error" in pulse && pulse.error);
}

export function isPulseSuccessState(
  pulse: PulsePayload | null,
): pulse is PulseSuccessPayload {
  return Boolean(pulse && !("error" in pulse));
}
