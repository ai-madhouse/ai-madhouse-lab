import { locales, normalizeLocale } from "@/lib/i18n";

const PUBLIC_FILE = /\.[^/]+$/;

export type ProxyDecision =
  | {
      kind: "next";
      setLocaleCookie?: string;
    }
  | {
      kind: "redirect";
      toPath: string;
      setLocaleCookie?: string;
    };

export function decideProxyAction({
  pathname,
  search,
  authCookieValue,
}: {
  pathname: string;
  search: string;
  authCookieValue?: string;
}): ProxyDecision {
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    PUBLIC_FILE.test(pathname)
  ) {
    return { kind: "next" };
  }

  const hasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );

  if (!hasLocale) {
    return {
      kind: "redirect",
      toPath: `/en${pathname}${search}`,
      setLocaleCookie: "en",
    };
  }

  const locale = normalizeLocale(pathname.split("/").filter(Boolean)[0]);
  const protectedRoutes = ["/dashboard", "/settings", "/live"]; // add more here if needed

  const isProtected = protectedRoutes.some(
    (route) =>
      pathname === `/${locale}${route}` ||
      pathname.startsWith(`/${locale}${route}/`),
  );

  if (isProtected && authCookieValue !== "1") {
    const nextPath = `${pathname}${search}`;
    return {
      kind: "redirect",
      toPath: `/${locale}/login?next=${encodeURIComponent(nextPath)}`,
      setLocaleCookie: locale,
    };
  }

  return { kind: "next", setLocaleCookie: locale };
}
