"use client";

import { useAtomValue } from "jotai";
import { Activity, FileText, Signal, Users } from "lucide-react";
import { useTranslations } from "next-intl";

import { RealtimeCardContent } from "@/components/dashboard/realtime-card-content";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { dashboardMetricsAtom } from "@/lib/runtime/app-atoms";

export function DashboardMetricsGrid() {
  const t = useTranslations("Dashboard");
  const metrics = useAtomValue(dashboardMetricsAtom);

  return (
    <section
      className="grid gap-6 md:grid-cols-4"
      data-layout-key="dashboard-metrics"
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("cards.sessions.label")}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <CardDescription>{t("cards.sessions.note")}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold">
            {metrics ? metrics.activeSessions : "–"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("cards.notes.label")}
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </div>
          <CardDescription>{t("cards.notes.note")}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold">
            {metrics ? metrics.notesCount : "–"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("cards.activity.label")}
            </CardTitle>
            <Signal className="h-4 w-4 text-muted-foreground" />
          </div>
          <CardDescription>{t("cards.activity.note")}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold">
            {metrics ? metrics.notesEventsLastDay : "–"}
          </p>
        </CardContent>
      </Card>

      <Card data-testid="dashboard-realtime-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("cards.realtime.label")}
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </div>
          <CardDescription>{t("cards.realtime.note")}</CardDescription>
        </CardHeader>
        <CardContent>
          <RealtimeCardContent />
        </CardContent>
      </Card>
    </section>
  );
}
