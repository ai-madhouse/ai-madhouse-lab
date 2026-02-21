"use client";

import { useAtom } from "jotai";
import { Activity, FileText, Signal, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  isPulseErrorState,
  isPulseSuccessState,
  type PulsePayload,
} from "@/lib/live/pulse-state";
import {
  fetchPulseSnapshot,
  livePulseAtom,
  livePulseErrorAtom,
  livePulseLoadingAtom,
} from "@/lib/runtime/live-state";
import { safeParseJson } from "@/lib/utils";

function formatWhen(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export function PulseBoard() {
  const t = useTranslations("Live");

  const [pulse, setPulse] = useAtom(livePulseAtom);
  const [, setError] = useAtom(livePulseErrorAtom);
  const [, setLoading] = useAtom(livePulseLoadingAtom);

  useEffect(() => {
    let closed = false;

    async function loadInitialPulse() {
      setLoading(true);
      try {
        const initial = await fetchPulseSnapshot();
        if (closed) return;
        setError(null);
        setPulse(initial);
      } catch (err) {
        if (closed) return;
        setError(err instanceof Error ? err.message : "pulse_failed");
      } finally {
        if (!closed) setLoading(false);
      }
    }

    void loadInitialPulse();

    const es = new EventSource("/api/pulse");

    es.addEventListener("pulse", (event) => {
      if (closed) return;
      const data = safeParseJson<PulsePayload>((event as MessageEvent).data);
      if (!data) return;
      setPulse(data);
    });

    es.onerror = () => {
      if (closed) return;
      setError("stream_failed");
    };

    return () => {
      closed = true;
      es.close();
    };
  }, [setError, setLoading, setPulse]);

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
