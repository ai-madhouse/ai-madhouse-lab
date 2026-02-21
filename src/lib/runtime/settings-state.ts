import { atom } from "jotai";
import { z } from "zod";

const sessionRowSchema = z.object({
  id: z.string(),
  created_at: z.string(),
  expires_at: z.string(),
  meta_iv: z.string().nullable(),
  meta_ciphertext: z.string().nullable(),
});

const sessionsResponseSchema = z.object({
  ok: z.literal(true),
  sessions: z.array(sessionRowSchema),
});

const sessionMeResponseSchema = z.object({
  ok: z.literal(true),
  sessionId: z.string(),
  ip: z.string(),
});

export type SessionRow = z.infer<typeof sessionRowSchema>;
export type SettingsWsStatus = "connecting" | "connected" | "disconnected";
export type SettingsAuthState =
  | { kind: "loading" }
  | { kind: "authenticated" }
  | { kind: "unauthenticated" };

export const settingsDekKeyAtom = atom<CryptoKey | null>(null);
export const settingsCsrfTokenAtom = atom<string | null>(null);
export const settingsRowsAtom = atom<SessionRow[]>([]);
export const settingsCurrentSessionIdAtom = atom<string | null>(null);
export const settingsErrorAtom = atom<string | null>(null);
export const settingsMetaWarningAtom = atom(false);
export const settingsLoadingAtom = atom(true);
export const settingsWsStatusAtom = atom<SettingsWsStatus>("disconnected");
export const settingsAuthAtom = atom<SettingsAuthState>({ kind: "loading" });
export const settingsSessionsCountAtom = atom(
  (get) => get(settingsRowsAtom).length,
);

function getApiErrorCode(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object" || !("error" in payload)) {
    return fallback;
  }

  const errorCode = payload.error;
  return typeof errorCode === "string" ? errorCode : fallback;
}

export async function fetchSessions() {
  const res = await fetch("/api/sessions", { cache: "no-store" });
  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(getApiErrorCode(payload, "sessions_failed"));
  }

  const parsed = sessionsResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error("invalid_sessions_response");
  }

  return parsed.data.sessions;
}

export async function fetchCurrentSession() {
  const res = await fetch("/api/session/me", { cache: "no-store" });
  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(getApiErrorCode(payload, "me_failed"));
  }

  const parsed = sessionMeResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error("invalid_me_response");
  }

  return parsed.data;
}

export async function fetchSettingsSnapshot() {
  const [sessions, me] = await Promise.all([
    fetchSessions(),
    fetchCurrentSession(),
  ]);
  return {
    sessions,
    currentSessionId: me.sessionId,
  };
}
