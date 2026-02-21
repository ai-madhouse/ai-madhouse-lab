"use client";

import type { z } from "zod";

import {
  apiUnauthorizedErrorSchema,
  csrfEndpointResponseSchema,
  dashboardMetricsResponseSchema,
  livePulseSnapshotResponseSchema,
  realtimeHealthSuccessResponseSchema,
  sessionMeSuccessResponseSchema,
  sessionsChangedSuccessResponseSchema,
} from "@/lib/schemas/internal-api";

export class ApiClientError extends Error {
  code: string;
  status: number;

  constructor({ code, status }: { code: string; status: number }) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

async function parseJsonOrNull(response: Response) {
  return (await response.json().catch(() => null)) as unknown;
}

async function requestJson<T>({
  path,
  init,
  successSchema,
}: {
  path: string;
  init?: RequestInit;
  successSchema: z.ZodType<T>;
}) {
  const response = await fetch(path, {
    cache: "no-store",
    ...init,
  });

  const payload = await parseJsonOrNull(response);

  if (!response.ok) {
    const unauthorized = apiUnauthorizedErrorSchema.safeParse(payload);
    if (unauthorized.success) {
      throw new ApiClientError({ code: unauthorized.data.error, status: 401 });
    }

    const errorCode =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : "request_failed";

    throw new ApiClientError({ code: errorCode, status: response.status });
  }

  const parsed = successSchema.safeParse(payload);
  if (!parsed.success) {
    throw new ApiClientError({ code: "invalid_response", status: 500 });
  }

  return parsed.data;
}

export async function fetchSessionMe() {
  return requestJson({
    path: "/api/session/me",
    successSchema: sessionMeSuccessResponseSchema,
  });
}

export async function fetchCsrfToken() {
  return requestJson({
    path: "/api/csrf",
    successSchema: csrfEndpointResponseSchema,
  });
}

export async function fetchRealtimeHealth() {
  return requestJson({
    path: "/api/realtime/health",
    successSchema: realtimeHealthSuccessResponseSchema,
  });
}

export async function fetchDashboardMetrics() {
  const response = await requestJson({
    path: "/api/dashboard/metrics",
    successSchema: dashboardMetricsResponseSchema,
  });

  return response.metrics;
}

export async function revokeOtherSessions(csrfToken: string) {
  return requestJson({
    path: "/api/sessions/revoke-others",
    init: {
      method: "POST",
      headers: {
        "x-csrf-token": csrfToken,
      },
    },
    successSchema: sessionsChangedSuccessResponseSchema,
  });
}

export async function signOutEverywhere(csrfToken: string) {
  return requestJson({
    path: "/api/sessions/signout-everywhere",
    init: {
      method: "POST",
      headers: {
        "x-csrf-token": csrfToken,
      },
    },
    successSchema: sessionsChangedSuccessResponseSchema,
  });
}

export async function fetchPulseSnapshot() {
  const response = await requestJson({
    path: "/api/pulse/snapshot",
    successSchema: livePulseSnapshotResponseSchema,
  });

  return response.pulse;
}
