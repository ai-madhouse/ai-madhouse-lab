"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { E2EEDekUnlockCard } from "@/components/crypto/e2ee-dek-unlock-card";
import { Button } from "@/components/roiui/button";
import { fetchCsrfTokenOrNull } from "@/lib/client/csrf";
import { decryptJson, encryptJson } from "@/lib/crypto/webcrypto";
import { describeUserAgent } from "@/lib/user-agent";

type SessionRow = {
  id: string;
  created_at: string;
  expires_at: string;
  meta_iv: string | null;
  meta_ciphertext: string | null;
};

type SessionMeta = {
  ip: string;
  userAgent: string;
};

// csrf token is fetched by E2EEDekUnlockCard and provided via onUnlocked

// (moved into E2EEDekUnlockCard)

// (moved into E2EEDekUnlockCard)

async function fetchSessions() {
  const res = await fetch("/api/sessions", { cache: "no-store" });
  const json = (await res.json().catch(() => null)) as
    | { ok: true; sessions: SessionRow[] }
    | { ok: false; error?: string }
    | null;

  if (!res.ok) {
    throw new Error(
      (json && "error" in json && json.error) || "sessions_failed",
    );
  }

  return (json && "sessions" in json && json.sessions) || [];
}

async function fetchMe() {
  const res = await fetch("/api/session/me", { cache: "no-store" });
  const json = (await res.json().catch(() => null)) as
    | { ok: true; sessionId: string; ip: string }
    | { ok: false; error?: string }
    | null;

  if (!res.ok) {
    throw new Error((json && "error" in json && json.error) || "me_failed");
  }

  if (!json || !("sessionId" in json) || !json.sessionId) {
    throw new Error("missing sessionId");
  }

  return json;
}

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

// (replaced with proper UI in E2EEDekUnlockCard)

// describeUserAgent moved to @/lib/user-agent
export function SessionsListE2EE({
  currentSessionId,
}: {
  currentSessionId: string | null;
}) {
  const [dekKey, setDekKey] = useState<CryptoKey | null>(null);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  const t = useTranslations("Settings.sessionsList");

  const [rows, setRows] = useState<SessionRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [metaWarning, setMetaWarning] = useState(false);
  const [loading, setLoading] = useState(true);

  function prettyError(raw: string) {
    switch (raw) {
      case "missing_csrf":
        return t("errors.missingCsrf");
      case "revoke_failed":
        return t("errors.revokeFailed");
      case "sessions_failed":
        return t("errors.sessionsFailed");
      case "me_failed":
        return t("errors.meFailed");
      case "meta_failed":
        return t("errors.metaFailed");
      default:
        return raw;
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setError(null);
      setLoading(true);

      try {
        // Fetch a fresh CSRF token for session actions.
        const token = await fetchCsrfTokenOrNull();
        if (!cancelled && token) setCsrfToken(token);
      } catch {
        // ignore
      }

      try {
        const sessions = await fetchSessions();
        if (!cancelled) setRows(sessions);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "sessions_failed");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const sessions = await fetchSessions();
        if (!cancelled) {
          setError(null);
          setRows(sessions);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "sessions_failed");
        }
      }
    }

    function onSessionsChanged() {
      void refresh();
    }

    window.addEventListener("madhouse:sessions:changed", onSessionsChanged);
    return () => {
      cancelled = true;
      window.removeEventListener(
        "madhouse:sessions:changed",
        onSessionsChanged,
      );
    };
  }, []);

  async function handleUnlocked(result: {
    csrfToken: string;
    dekKey: CryptoKey;
  }) {
    setError(null);
    setMetaWarning(false);
    setDekKey(result.dekKey);
    setCsrfToken(result.csrfToken);

    // Ensure current session meta exists (nice-to-have; not required for revocation).
    try {
      const me = await fetchMe();
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
        {rows.map((s) => (
          <SessionRowItem
            key={s.id}
            row={s}
            current={currentSessionId ? s.id === currentSessionId : false}
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
  current,
  dekKey,
  onRevoke,
}: {
  row: SessionRow;
  current: boolean;
  dekKey: CryptoKey | null;
  onRevoke: (sessionId: string) => void;
}) {
  const ts = useTranslations("Settings.sessions");
  const t = useTranslations("Settings.sessionsList");

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

    run();

    return () => {
      cancelled = true;
    };
  }, [dekKey, row.meta_ciphertext, row.meta_iv]);

  const desc = meta ? describeUserAgent(meta.userAgent) : null;

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
          {current ? (
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
