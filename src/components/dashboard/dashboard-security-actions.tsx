"use client";

import { useLocale } from "next-intl";
import { useState } from "react";

import { buttonClassName } from "@/components/roiui/button";
import { fetchCsrfTokenOrThrow } from "@/lib/client/csrf";

export function DashboardSecurityActions({
  isAuthed,
  revokeLabel,
  signOutLabel,
}: {
  isAuthed: boolean;
  revokeLabel: string;
  signOutLabel: string;
}) {
  const locale = useLocale();
  const [busy, setBusy] = useState<"revoke" | "signout" | null>(null);

  async function callApi(pathname: string, nextBusy: "revoke" | "signout") {
    if (!isAuthed || busy) return;

    setBusy(nextBusy);
    try {
      const csrfToken = await fetchCsrfTokenOrThrow();
      const response = await fetch(pathname, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: "{}",
      });

      if (!response.ok) {
        throw new Error("action_failed");
      }

      if (pathname.includes("signout-everywhere")) {
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
          void callApi("/api/settings/revoke-other-sessions", "revoke");
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
          void callApi("/api/settings/signout-everywhere", "signout");
        }}
      >
        {signOutLabel}
      </button>
    </div>
  );
}
