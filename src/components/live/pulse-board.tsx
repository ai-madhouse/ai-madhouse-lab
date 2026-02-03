"use client";

import { Activity } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function randomBetween(min: number, max: number) {
  return Math.round(min + Math.random() * (max - min));
}

type PulsePayload = {
  latency: number;
  throughput: number;
  errors: number;
  confidence: number;
};

export function PulseBoard() {
  const t = useTranslations("Live");
  const [pulse, setPulse] = useState<PulsePayload>({
    latency: 128,
    throughput: 940,
    errors: 0.4,
    confidence: 87,
  });

  useEffect(() => {
    let closed = false;

    // Prefer server-sent events if available.
    const es = new EventSource("/api/pulse");

    const fallbackId = setInterval(() => {
      if (closed) return;
      setPulse((prev) => ({
        latency: randomBetween(110, 180),
        throughput: randomBetween(880, 1040),
        errors: Number((Math.random() * 0.8).toFixed(2)),
        confidence: Math.min(
          99,
          Math.max(80, prev.confidence + randomBetween(-2, 2)),
        ),
      }));
    }, 2200);

    es.addEventListener("pulse", (event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data) as PulsePayload;
        setPulse({
          latency: data.latency,
          throughput: data.throughput,
          errors: data.errors,
          confidence: data.confidence,
        });
      } catch {
        // ignore
      }
    });

    es.onerror = () => {
      // Keep fallback timer running.
    };

    return () => {
      closed = true;
      clearInterval(fallbackId);
      es.close();
    };
  }, []);

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
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border/60 bg-background p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {t("metrics.latency")}
          </p>
          <p className="text-2xl font-semibold">
            {pulse.latency} {t("units.ms")}
          </p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-background p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {t("metrics.throughput")}
          </p>
          <p className="text-2xl font-semibold">
            {pulse.throughput}
            {t("units.perSecond")}
          </p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-background p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {t("metrics.errors")}
          </p>
          <p className="text-2xl font-semibold">
            {pulse.errors}
            {t("units.percent")}
          </p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-background p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {t("metrics.confidence")}
          </p>
          <p className="text-2xl font-semibold">
            {pulse.confidence}
            {t("units.percent")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
