"use client";

import { useAtomValue, useSetAtom } from "jotai";
import { Activity, FileText, Signal, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isPulseErrorState, isPulseSuccessState } from "@/lib/live/pulse-state";
import { fetchPulseSnapshot } from "@/lib/runtime/api-client";
import { livePulseAtom, liveWsStatusAtom } from "@/lib/runtime/app-atoms";
import { subscribeRealtimeWs } from "@/lib/runtime/ws-client";

function formatWhen(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export function PulseBoard() {
  const t = useTranslations("Live");

  const pulse = useAtomValue(livePulseAtom);
  const setPulse = useSetAtom(livePulseAtom);
  const setWsStatus = useSetAtom(liveWsStatusAtom);

  const refreshingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function refreshPulse() {
      if (refreshingRef.current) {
        return;
      }

      refreshingRef.current = true;
      try {
        const snapshot = await fetchPulseSnapshot();
        if (!cancelled) {
          setPulse(snapshot);
        }
      } catch (error) {
        if (!cancelled) {
          setPulse({
            ts: Date.now(),
            error: error instanceof Error ? error.message : "pulse failed",
          });
        }
      } finally {
        refreshingRef.current = false;
      }
    }

    void refreshPulse();

    const pollId = setInterval(() => {
      void refreshPulse();
    }, 2_000);

    const unsubscribeWs = subscribeRealtimeWs({
      onStatus: (status) => {
        setWsStatus(status);
      },
      onEvent: (event) => {
        if (
          event.type === "hello" ||
          event.type === "sessions:changed" ||
          event.type === "notes:changed"
        ) {
          void refreshPulse();
        }
      },
    });

    return () => {
      cancelled = true;
      clearInterval(pollId);
      unsubscribeWs();
    };
  }, [setPulse, setWsStatus]);

  const isError = isPulseErrorState(pulse);
  const current = isPulseSuccessState(pulse) ? pulse : null;

  return (
    <Card className="bg-secondary/40">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{t("boardTitle")}</CardTitle>
          <Activity
            className="h-4 w-4 text-muted-foreground"
            aria-label={t("icon")}
          />
        </div>
        <p className="text-sm text-muted-foreground">{t("boardSubtitle")}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {isError ? (
          <div
            className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
            role="alert"
          >
            {t("errors.stream")}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-border/60 bg-background p-4">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              <Users
                className="h-4 w-4"
                aria-label={t("metrics.sessions.icon")}
              />
              {t("metrics.sessions.label")}
            </p>
            <p className="text-2xl font-semibold">
              {current ? current.activeSessions : "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("metrics.sessions.note")}
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-background p-4">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              <FileText
                className="h-4 w-4"
                aria-label={t("metrics.notes.icon")}
              />
              {t("metrics.notes.label")}
            </p>
            <p className="text-2xl font-semibold">
              {current ? current.notesCount : "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("metrics.notes.note")}
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-background p-4">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              <Signal
                className="h-4 w-4"
                aria-label={t("metrics.writes.icon")}
              />
              {t("metrics.writes.label")}
            </p>
            <p className="text-2xl font-semibold">
              {current ? current.notesEventsLastHour : "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("metrics.writes.note")}
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-background p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {t("metrics.lastActivity.label")}
            </p>
            <p className="text-sm font-medium">
              {current ? formatWhen(current.lastNotesActivityAt) : "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("metrics.lastActivity.note")}
            </p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          {t("footer", {
            ts: new Date(pulse?.ts ?? Date.now()).toLocaleTimeString(),
          })}
        </p>
      </CardContent>
    </Card>
  );
}
