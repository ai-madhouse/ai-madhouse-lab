"use client";

import { useAtomValue } from "jotai";
import { useLocale } from "next-intl";
import { useState } from "react";

import { buttonClassName } from "@/components/roiui/button";
import {
  fetchCsrfToken,
  revokeOtherSessions,
  signOutEverywhere,
} from "@/lib/runtime/api-client";
import { authSessionAtom } from "@/lib/runtime/app-atoms";

export function DashboardSecurityActions({
  revokeLabel,
  signOutLabel,
}: {
  revokeLabel: string;
  signOutLabel: string;
}) {
  const locale = useLocale();
  const sessionState = useAtomValue(authSessionAtom);
  const isAuthed = sessionState.kind === "authenticated";
  const [busy, setBusy] = useState<"revoke" | "signout" | null>(null);

  async function callApi(nextBusy: "revoke" | "signout") {
    if (!isAuthed || busy) return;

    setBusy(nextBusy);
    try {
      const csrf = await fetchCsrfToken();
      const csrfToken = csrf.token;

      if (nextBusy === "revoke") {
        await revokeOtherSessions(csrfToken);
      } else {
        await signOutEverywhere(csrfToken);
      }

      if (nextBusy === "signout") {
        window.location.href = `/${locale}/login`;
      }
    } catch {
      // keep silent; route state refresh will reconcile UI
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className={buttonClassName({
          variant: "outline",
          size: "sm",
        })}
        disabled={!isAuthed || busy !== null}
        onClick={() => {
          void callApi("revoke");
        }}
      >
        {revokeLabel}
      </button>

      <button
        type="button"
        className={buttonClassName({
          variant: "destructive",
          size: "sm",
        })}
        disabled={!isAuthed || busy !== null}
        onClick={() => {
          void callApi("signout");
        }}
      >
        {signOutLabel}
      </button>
    </div>
  );
}
