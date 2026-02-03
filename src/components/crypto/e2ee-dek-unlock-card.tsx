"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createWrappedDek,
  importDek,
  unwrapDek,
  type WrappedKey,
} from "@/lib/crypto/webcrypto";

type KeyRecord = WrappedKey & {
  username: string;
  created_at: string;
};

type UnlockResult = {
  csrfToken: string;
  dekKey: CryptoKey;
};

async function fetchCsrfToken() {
  const res = await fetch("/api/csrf", { cache: "no-store" });
  const json = (await res.json().catch(() => null)) as
    | { ok: true; token: string }
    | { ok: false; error?: string }
    | null;

  if (res.ok && json && "ok" in json && json.ok) return json.token;
  throw new Error((json && "error" in json && json.error) || "csrf failed");
}

async function fetchKeyRecord() {
  const res = await fetch("/api/crypto/key", { cache: "no-store" });
  const json = (await res.json().catch(() => null)) as
    | { ok: true; key: KeyRecord }
    | { ok: false; error?: string }
    | null;

  if (res.ok && json && "ok" in json && json.ok) return json.key;
  if (res.status === 404) return null;

  throw new Error((json && "error" in json && json.error) || "key failed");
}

async function createKeyRecord({
  csrfToken,
  wrapped,
}: {
  csrfToken: string;
  wrapped: WrappedKey;
}) {
  const res = await fetch("/api/crypto/key", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify(wrapped),
  });

  const json = (await res.json().catch(() => null)) as
    | { ok: true }
    | { ok: false; error?: string }
    | null;

  if (!res.ok) {
    throw new Error(
      (json && "error" in json && json.error) || "key create failed",
    );
  }
}

function normalizePassphrase(value: string) {
  return value.trim();
}

function validatePassphrase(passphrase: string) {
  if (passphrase.length < 12) {
    return "Use at least 12 characters.";
  }
  return null;
}

export function E2EEDekUnlockCard({
  label,
  description,
  onUnlocked,
}: {
  label: string;
  description: string;
  onUnlocked: (result: UnlockResult) => void | Promise<void>;
}) {
  const [csrfToken, setCsrfToken] = useState<string>("");
  const [keyRecord, setKeyRecord] = useState<KeyRecord | null>(null);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [setupPassphrase, setSetupPassphrase] = useState("");
  const [setupConfirm, setSetupConfirm] = useState("");

  const [unlockPassphrase, setUnlockPassphrase] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setError(null);
      setLoading(true);
      try {
        const token = await fetchCsrfToken();
        if (cancelled) return;
        setCsrfToken(token);

        const record = await fetchKeyRecord();
        if (cancelled) return;
        setKeyRecord(record);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "failed to load E2EE");
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

  async function createAndUnlock() {
    if (busy) return;

    setError(null);

    const passphrase = normalizePassphrase(setupPassphrase);
    const confirm = normalizePassphrase(setupConfirm);

    const validation = validatePassphrase(passphrase);
    if (validation) {
      setError(validation);
      return;
    }

    if (passphrase !== confirm) {
      setError("Passphrases do not match.");
      return;
    }

    setBusy(true);
    try {
      const token = csrfToken || (await fetchCsrfToken());
      setCsrfToken(token);

      const created = await createWrappedDek(passphrase);
      await createKeyRecord({ csrfToken: token, wrapped: created.wrapped });

      const record = await fetchKeyRecord();
      if (!record) throw new Error("missing key record");
      setKeyRecord(record);

      const dekRaw = await unwrapDek({ passphrase, wrapped: record });
      const dekKey = await importDek(dekRaw);

      setSetupPassphrase("");
      setSetupConfirm("");
      setUnlockPassphrase("");

      await onUnlocked({ csrfToken: token, dekKey });
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed to set up E2EE");
    } finally {
      setBusy(false);
    }
  }

  async function unlock() {
    if (busy) return;

    setError(null);

    const passphrase = normalizePassphrase(unlockPassphrase);
    if (!passphrase) {
      setError("Passphrase required.");
      return;
    }

    setBusy(true);

    try {
      const token = csrfToken || (await fetchCsrfToken());
      setCsrfToken(token);

      const record = keyRecord ?? (await fetchKeyRecord());
      if (!record) throw new Error("missing key record");
      setKeyRecord(record);

      const dekRaw = await unwrapDek({ passphrase, wrapped: record });
      const dekKey = await importDek(dekRaw);

      setUnlockPassphrase("");
      await onUnlocked({ csrfToken: token, dekKey });
    } catch (err) {
      setError(err instanceof Error ? err.message : "unlock failed");
    } finally {
      setBusy(false);
    }
  }

  const needsSetup = !loading && !keyRecord;

  return (
    <div className="space-y-3 rounded-2xl border border-border/60 bg-card p-5">
      <div className="space-y-1">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : null}

      {needsSetup ? (
        <div className="space-y-3">
          <div className="grid gap-2">
            <Input
              type="password"
              value={setupPassphrase}
              onChange={(e) => setSetupPassphrase(e.target.value)}
              placeholder="Set an E2EE passphrase (min 12 chars)"
              autoComplete="new-password"
              disabled={busy}
            />
            <Input
              type="password"
              value={setupConfirm}
              onChange={(e) => setSetupConfirm(e.target.value)}
              placeholder="Confirm passphrase"
              autoComplete="new-password"
              disabled={busy}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={createAndUnlock} disabled={busy}>
              Create & unlock
            </Button>
          </div>
        </div>
      ) : null}

      {!needsSetup && !loading ? (
        <div className="space-y-3">
          <div className="grid gap-2">
            <Input
              type="password"
              value={unlockPassphrase}
              onChange={(e) => setUnlockPassphrase(e.target.value)}
              placeholder="Enter your E2EE passphrase"
              autoComplete="current-password"
              disabled={busy}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void unlock();
                }
              }}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={unlock} disabled={busy}>
              Unlock
            </Button>
          </div>
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
