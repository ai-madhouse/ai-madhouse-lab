"use client";

import { useEffect, useState } from "react";

import { E2EEDekUnlockCard } from "@/components/crypto/e2ee-dek-unlock-card";
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
      (json && "error" in json && json.error) || "sessions failed",
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
    throw new Error((json && "error" in json && json.error) || "me failed");
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
    throw new Error((json && "error" in json && json.error) || "meta failed");
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

  const [rows, setRows] = useState<SessionRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setError(null);
      setLoading(true);
      try {
        const sessions = await fetchSessions();
        if (!cancelled) setRows(sessions);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "failed to load sessions",
          );
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

  async function handleUnlocked(result: {
    csrfToken: string;
    dekKey: CryptoKey;
  }) {
    setError(null);
    setDekKey(result.dekKey);

    try {
      // Ensure current session meta exists.
      const me = await fetchMe();
      const meta: SessionMeta = { ip: me.ip, userAgent: navigator.userAgent };
      const payload = await encryptJson({ key: result.dekKey, value: meta });
      await upsertSessionMeta({
        csrfToken: result.csrfToken,
        sessionId: me.sessionId,
        payload,
      });

      const sessions = await fetchSessions();
      setRows(sessions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "unlock failed");
    }
  }

  return (
    <div className="space-y-3">
      {!dekKey ? (
        <E2EEDekUnlockCard
          label="Unlock session details"
          description="Session device details are end-to-end encrypted. Unlock to view browser/OS/IP and to encrypt your current session metadata."
          onUnlocked={handleUnlocked}
        />
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="space-y-2">
        {rows.map((s) => (
          <SessionRowItem
            key={s.id}
            row={s}
            current={currentSessionId ? s.id === currentSessionId : false}
            dekKey={dekKey}
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
}: {
  row: SessionRow;
  current: boolean;
  dekKey: CryptoKey | null;
}) {
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
    <div className="flex flex-col gap-1 rounded-xl border border-border/60 bg-background p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">
          {meta && desc ? (
            <>
              {desc.browser} • {desc.os} • {meta.ip}
            </>
          ) : (
            "Encrypted (unlock to view)"
          )}
        </p>
        {current ? (
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Current
          </p>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">
        Created: {new Date(row.created_at).toLocaleString()} • Expires:{" "}
        {new Date(row.expires_at).toLocaleString()}
      </p>
    </div>
  );
}
