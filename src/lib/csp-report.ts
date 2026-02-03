export type NormalizedCspReport = {
  type: string;
  blocked?: string;
  document?: string;
  effectiveDirective?: string;
  violatedDirective?: string;
  disposition?: string;
  statusCode?: number;
};

export function redactUrlish(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const u = new URL(value);
    // Drop query/fragment to avoid leaking tokens, note IDs, etc.
    u.search = "";
    u.hash = "";
    return u.toString();
  } catch {
    return undefined;
  }
}

/**
 * Normalize CSP / Reporting API payloads into a redacted, bounded list.
 *
 * Accepts:
 * - CSP legacy-ish: {"csp-report": {...}}
 * - Reporting API: [{type, url, body:{...}}] or a single object
 */
export function normalizeCspReports(
  payload: unknown,
  opts?: { maxEvents?: number },
): NormalizedCspReport[] {
  const maxEvents = opts?.maxEvents ?? 20;

  const events = Array.isArray(payload) ? payload : [payload];

  const out: NormalizedCspReport[] = [];

  for (const e of events) {
    if (out.length >= maxEvents) break;

    // Reporting API usually wraps the useful stuff in `body`.
    const maybeObj: Record<string, unknown> | null =
      e && typeof e === "object" ? (e as Record<string, unknown>) : null;

    const csp: Record<string, unknown> | null = (() => {
      if (!maybeObj) return null;

      const legacy = maybeObj["csp-report"];
      if (legacy && typeof legacy === "object") {
        return legacy as Record<string, unknown>;
      }

      const body = maybeObj.body;
      if (body && typeof body === "object") {
        return body as Record<string, unknown>;
      }

      return maybeObj;
    })();

    out.push({
      type:
        typeof maybeObj?.type === "string" ? (maybeObj.type as string) : "csp",
      blocked: redactUrlish(csp?.["blocked-uri"]),
      document: redactUrlish(csp?.["document-uri"]),
      effectiveDirective:
        typeof csp?.["effective-directive"] === "string"
          ? (csp["effective-directive"] as string)
          : undefined,
      violatedDirective:
        typeof csp?.["violated-directive"] === "string"
          ? (csp["violated-directive"] as string)
          : undefined,
      disposition:
        typeof csp?.disposition === "string"
          ? (csp.disposition as string)
          : undefined,
      statusCode:
        typeof csp?.["status-code"] === "number"
          ? (csp["status-code"] as number)
          : undefined,
    });
  }

  return out;
}
