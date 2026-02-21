"use client";

import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { E2EEDekUnlockCard } from "@/components/crypto/e2ee-dek-unlock-card";
import { Button } from "@/components/roiui/button";
import { fetchCsrfTokenOrNull } from "@/lib/client/csrf";
import { decryptJson, encryptJson } from "@/lib/crypto/webcrypto";
import {
  fetchCurrentSession,
  fetchSessions,
  fetchSettingsSnapshot,
  type SessionRow,
  settingsAuthAtom,
  settingsCsrfTokenAtom,
  settingsCurrentSessionIdAtom,
  settingsDekKeyAtom,
  settingsErrorAtom,
  settingsLoadingAtom,
  settingsMetaWarningAtom,
  settingsRowsAtom,
  settingsWsStatusAtom,
} from "@/lib/runtime/settings-state";
import { subscribeRealtimeWs } from "@/lib/runtime/ws-client";
import { describeUserAgent } from "@/lib/user-agent";

type SessionMeta = {
  ip: string;
  userAgent: string;
};

const errorLabelKeyMap: Record<string, string> = {
  missing_csrf: "errors.missingCsrf",
  revoke_failed: "errors.revokeFailed",
  sessions_failed: "errors.sessionsFailed",
  me_failed: "errors.meFailed",
  meta_failed: "errors.metaFailed",
};

async function upsertSessionMeta({
  csrfToken,
  sessionId,
  payload,
}: {
  csrfToken: string;
  sessionId: string;
  payload: { payload_iv: string; payload_ciphertext: string };
}) {
  const res = await fetch("/api/sessions/meta", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify({
      session_id: sessionId,
      payload_iv: payload.payload_iv,
      payload_ciphertext: payload.payload_ciphertext,
    }),
  });

  const json = (await res.json().catch(() => null)) as
    | { ok: true }
    | { ok: false; error?: string }
    | null;

  if (!res.ok) {
    throw new Error((json && "error" in json && json.error) || "meta_failed");
  }
}

export function SessionsListE2EE() {
  const t = useTranslations("Settings.sessionsList");

  const [dekKey, setDekKey] = useAtom(settingsDekKeyAtom);
  const [csrfToken, setCsrfToken] = useAtom(settingsCsrfTokenAtom);
  const [rows, setRows] = useAtom(settingsRowsAtom);
  const setCurrentSessionId = useSetAtom(settingsCurrentSessionIdAtom);
  const authState = useAtomValue(settingsAuthAtom);
  const setAuthState = useSetAtom(settingsAuthAtom);
  const [error, setError] = useAtom(settingsErrorAtom);
  const [metaWarning, setMetaWarning] = useAtom(settingsMetaWarningAtom);
  const [loading, setLoading] = useAtom(settingsLoadingAtom);
  const setWsStatus = useSetAtom(settingsWsStatusAtom);

  function prettyError(raw: string) {
    const labelKey = errorLabelKeyMap[raw];
    return labelKey ? t(labelKey) : raw;
  }

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setError(null);
      setLoading(true);
      setAuthState({ kind: "loading" });

      try {
        const token = await fetchCsrfTokenOrNull();
        if (!cancelled && token) setCsrfToken(token);
      } catch {
        // ignore
      }

      try {
        const snapshot = await fetchSettingsSnapshot();
        if (!cancelled) {
          setRows(snapshot.sessions);
          setCurrentSessionId(snapshot.currentSessionId);
          setAuthState({ kind: "authenticated" });
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : "sessions_failed";
          setError(message);
          setAuthState(
            message === "unauthorized"
              ? { kind: "unauthenticated" }
              : { kind: "authenticated" },
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [
    setAuthState,
    setCsrfToken,
    setCurrentSessionId,
    setError,
    setLoading,
    setRows,
  ]);

  useEffect(() => {
    if (authState.kind !== "authenticated") {
      return () => {};
    }

    async function refreshFromRealtime() {
      try {
        const sessions = await fetchSessions();
        setError(null);
        setRows(sessions);
      } catch (err) {
        setError(err instanceof Error ? err.message : "sessions_failed");
      }
    }

    return subscribeRealtimeWs({
      onStatus: setWsStatus,
      onEvent: (event) => {
        if (event.type === "sessions:changed") {
          void refreshFromRealtime();
        }
      },
    });
  }, [authState.kind, setError, setRows, setWsStatus]);

  async function handleUnlocked(result: {
    csrfToken: string;
    dekKey: CryptoKey;
  }) {
    setError(null);
    setMetaWarning(false);
    setDekKey(result.dekKey);
    setCsrfToken(result.csrfToken);

    try {
      const me = await fetchCurrentSession();
      setCurrentSessionId(me.sessionId);
      const meta: SessionMeta = { ip: me.ip, userAgent: navigator.userAgent };
      const payload = await encryptJson({ key: result.dekKey, value: meta });
      await upsertSessionMeta({
        csrfToken: result.csrfToken,
        sessionId: me.sessionId,
        payload,
      });
    } catch {
      setMetaWarning(true);
    }

    try {
      const sessions = await fetchSessions();
      setRows(sessions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "sessions_failed");
    }
  }

  async function revokeSession(sessionId: string) {
    if (!csrfToken) {
      setError("missing_csrf");
      return;
    }

    setError(null);

    try {
      const res = await fetch(
        `/api/sessions/${encodeURIComponent(sessionId)}`,
        {
          method: "DELETE",
          headers: {
            "x-csrf-token": csrfToken,
          },
        },
      );
      const json = (await res.json().catch(() => null)) as
        | { ok: true }
        | { ok: false; error?: string }
        | null;

      if (!res.ok || !json || !json.ok) {
        throw new Error(
          (json && "error" in json && json.error) || "revoke_failed",
        );
      }

      const sessions = await fetchSessions();
      setRows(sessions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "revoke_failed");
    }
  }

  return (
    <div className="space-y-3">
      {!dekKey ? (
        <E2EEDekUnlockCard
          label={t("unlockLabel")}
          description={t("unlockDescription")}
          onUnlocked={handleUnlocked}
        />
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">{t("loading")}</p>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive">{prettyError(error)}</p>
      ) : null}
      {metaWarning ? (
        <p className="text-sm text-muted-foreground">{t("metaWarning")}</p>
      ) : null}

      <div className="space-y-2">
        {rows.map((sessionRow) => (
          <SessionRowItem
            key={sessionRow.id}
            row={sessionRow}
            dekKey={dekKey}
            onRevoke={revokeSession}
          />
        ))}
      </div>
    </div>
  );
}

function SessionRowItem({
  row,
  dekKey,
  onRevoke,
}: {
  row: SessionRow;
  dekKey: CryptoKey | null;
  onRevoke: (sessionId: string) => void;
}) {
  const ts = useTranslations("Settings.sessions");
  const t = useTranslations("Settings.sessionsList");
  const [currentSessionId] = useAtom(settingsCurrentSessionIdAtom);
  const [meta, setMeta] = useState<SessionMeta | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!dekKey || !row.meta_iv || !row.meta_ciphertext) {
        setMeta(null);
        return;
      }

      try {
        const decoded = await decryptJson<SessionMeta>({
          key: dekKey,
          payload_iv: row.meta_iv,
          payload_ciphertext: row.meta_ciphertext,
        });
        if (!cancelled) setMeta(decoded);
      } catch {
        if (!cancelled) setMeta(null);
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [dekKey, row.meta_ciphertext, row.meta_iv]);

  const desc = meta ? describeUserAgent(meta.userAgent) : null;
  const isCurrent = currentSessionId ? row.id === currentSessionId : false;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-background p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <p className="text-sm font-medium">
            {meta && desc ? (
              <>
                {desc.browser} • {desc.os} • {meta.ip}
              </>
            ) : (
              t("encryptedLocked")
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {ts("createdAt")}: {new Date(row.created_at).toLocaleString()} •{" "}
            {ts("expiresAt")}: {new Date(row.expires_at).toLocaleString()}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isCurrent ? (
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              {ts("current")}
            </p>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onRevoke(row.id)}
            >
              {t("revoke")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
