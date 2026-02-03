import { normalizeLocale } from "@/lib/i18n";

const DEFAULT_AFTER_LOGIN = "/dashboard";

function isProbablyAbsoluteUrl(value: string) {
  return /^([a-zA-Z][a-zA-Z\d+.-]*:)?\/\//.test(value);
}

export function safeNextPath(rawLocale: string, rawNext?: string | null) {
  const locale = normalizeLocale(rawLocale);
  const fallback = `/${locale}${DEFAULT_AFTER_LOGIN}`;

  const next = (rawNext ?? "").trim();
  if (!next) return fallback;

  // Reject absolute URLs and protocol-relative URLs.
  if (isProbablyAbsoluteUrl(next)) return fallback;

  // We only allow app-internal absolute paths.
  if (!next.startsWith("/")) return fallback;

  // Prevent locale escape. For example: /ru/... while logging into /en.
  if (next !== `/${locale}` && !next.startsWith(`/${locale}/`)) {
    return fallback;
  }

  return next;
}
