"use client";

import { useAtomValue, useSetAtom } from "jotai";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/roiui/button";
import { Input } from "@/components/roiui/input";
import { derivedKekCacheAtom } from "@/lib/crypto/derived-kek-cache";
import {
  createWrappedDek,
  deriveKekFromPassphrase,
  importDek,
  unwrapDekWithKek,
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

// validatePassphrase moved inside component (needs i18n)

export function E2EEDekUnlockCard({
  label,
  description,
  onUnlocked,
}: {
  label: string;
  description: string;
  onUnlocked: (result: UnlockResult) => void | Promise<void>;
}) {
  const t = useTranslations("Crypto.e2ee");

  function validatePassphrase(passphrase: string) {
    if (passphrase.length < 12) {
      return t("errors.passphraseTooShort");
    }
    return null;
  }

  const [csrfToken, setCsrfToken] = useState<string>("");
  const [keyRecord, setKeyRecord] = useState<KeyRecord | null>(null);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [setupPassphrase, setSetupPassphrase] = useState("");
  const [setupConfirm, setSetupConfirm] = useState("");

  const [unlockPassphrase, setUnlockPassphrase] = useState("");

  const derivedKekCache = useAtomValue(derivedKekCacheAtom);
  const setDerivedKekCache = useSetAtom(derivedKekCacheAtom);

  const autoUnlockAttemptedForRef = useRef<string | null>(null);

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
          setError(err instanceof Error ? err.message : t("errors.loadFailed"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [t]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (loading || busy) return;
      if (!keyRecord) return;
      if (!csrfToken) return;

      const entry = derivedKekCache[keyRecord.username];
      if (!entry || entry.kdf_salt !== keyRecord.kdf_salt) return;

      const attemptKey = `${keyRecord.username}:${keyRecord.kdf_salt}`;
      if (autoUnlockAttemptedForRef.current === attemptKey) return;
      autoUnlockAttemptedForRef.current = attemptKey;

      setBusy(true);
      try {
        const dekRaw = await unwrapDekWithKek({
          kek: entry.kek,
          wrapped: keyRecord,
        });
        const dekKey = await importDek(dekRaw);
        await onUnlocked({ csrfToken, dekKey });
      } catch {
        setDerivedKekCache((prev) => {
          const current = prev[keyRecord.username];
          if (!current || current.kdf_salt !== keyRecord.kdf_salt) return prev;
          const next = { ...prev };
          delete next[keyRecord.username];
          return next;
        });
      } finally {
        if (!cancelled) setBusy(false);
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [
    loading,
    busy,
    keyRecord,
    csrfToken,
    derivedKekCache,
    onUnlocked,
    setDerivedKekCache,
  ]);

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
      setError(t("errors.passphrasesMismatch"));
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

      const kek =
        record.kdf_salt === created.wrapped.kdf_salt
          ? created.kek
          : await deriveKekFromPassphrase({
              passphrase,
              kdf_salt: record.kdf_salt,
            });

      setDerivedKekCache((prev) => ({
        ...prev,
        [record.username]: { kdf_salt: record.kdf_salt, kek },
      }));

      const dekRaw =
        record.kdf_salt === created.wrapped.kdf_salt &&
        record.wrapped_key_iv === created.wrapped.wrapped_key_iv &&
        record.wrapped_key_ciphertext === created.wrapped.wrapped_key_ciphertext
          ? created.dekRaw
          : await unwrapDekWithKek({ kek, wrapped: record });

      const dekKey = await importDek(dekRaw);

      setSetupPassphrase("");
      setSetupConfirm("");
      setUnlockPassphrase("");

      await onUnlocked({ csrfToken: token, dekKey });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.setupFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function unlock() {
    if (busy) return;

    setError(null);

    const passphrase = normalizePassphrase(unlockPassphrase);
    if (!passphrase) {
      setError(t("errors.passphraseRequired"));
      return;
    }

    setBusy(true);

    try {
      const token = csrfToken || (await fetchCsrfToken());
      setCsrfToken(token);

      const record = keyRecord ?? (await fetchKeyRecord());
      if (!record) throw new Error("missing key record");
      setKeyRecord(record);

      const kek = await deriveKekFromPassphrase({
        passphrase,
        kdf_salt: record.kdf_salt,
      });

      const dekRaw = await unwrapDekWithKek({ kek, wrapped: record });
      const dekKey = await importDek(dekRaw);

      setDerivedKekCache((prev) => ({
        ...prev,
        [record.username]: { kdf_salt: record.kdf_salt, kek },
      }));

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
        <p className="text-sm text-muted-foreground">{t("loading")}</p>
      ) : null}

      {needsSetup ? (
        <div className="space-y-3">
          <div className="grid gap-2">
            <Input
              type="password"
              value={setupPassphrase}
              onChange={(e) => setSetupPassphrase(e.target.value)}
              placeholder={t("placeholders.setupPassphrase")}
              autoComplete="new-password"
              disabled={busy}
            />
            <Input
              type="password"
              value={setupConfirm}
              onChange={(e) => setSetupConfirm(e.target.value)}
              placeholder={t("placeholders.setupConfirm")}
              autoComplete="new-password"
              disabled={busy}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={createAndUnlock} disabled={busy}>
              {t("actions.createAndUnlock")}
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
              placeholder={t("placeholders.unlockPassphrase")}
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
              {t("actions.unlock")}
            </Button>
          </div>
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
