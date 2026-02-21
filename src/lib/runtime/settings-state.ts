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

export const settingsDekKeyAtom = atom<CryptoKey | null>(null);
export const settingsCsrfTokenAtom = atom<string | null>(null);
export const settingsRowsAtom = atom<SessionRow[]>([]);
export const settingsCurrentSessionIdAtom = atom<string | null>(null);
export const settingsErrorAtom = atom<string | null>(null);
export const settingsMetaWarningAtom = atom(false);
export const settingsLoadingAtom = atom(true);

export async function fetchSessions() {
  const res = await fetch("/api/sessions", { cache: "no-store" });
  const json = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      json && typeof json === "object" && "error" in json
        ? String((json as { error?: unknown }).error ?? "sessions_failed")
        : "sessions_failed";
    throw new Error(message);
  }

  const parsed = sessionsResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error("invalid_sessions_response");
  }

  return parsed.data.sessions;
}

export async function fetchCurrentSession() {
  const res = await fetch("/api/session/me", { cache: "no-store" });
  const json = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      json && typeof json === "object" && "error" in json
        ? String((json as { error?: unknown }).error ?? "me_failed")
        : "me_failed";
    throw new Error(message);
  }

  const parsed = sessionMeResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error("invalid_me_response");
  }

  return parsed.data;
}
