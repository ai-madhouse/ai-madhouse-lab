import { isLocale } from "@/lib/i18n";

export function switchLocalePathname({
  pathname,
  nextLocale,
}: {
  pathname: string;
  nextLocale: string;
}) {
  const segments = pathname.split("/").filter(Boolean);
  const hadLeadingSlash = pathname.startsWith("/");
  const hadTrailingSlash = pathname.length > 1 && pathname.endsWith("/");

  const rest =
    segments.length > 0 && isLocale(segments[0]) ? segments.slice(1) : segments;

  const next = [nextLocale, ...rest].join("/");
  const nextPath = `${hadLeadingSlash ? "/" : ""}${next}` || `/${nextLocale}`;

  return hadTrailingSlash && nextPath !== "/" ? `${nextPath}/` : nextPath;
}
