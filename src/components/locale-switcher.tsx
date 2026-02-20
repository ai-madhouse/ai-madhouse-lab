"use client";

import { ChevronDown, Globe2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { locales } from "@/lib/i18n";
import { switchLocalePathname } from "@/lib/locale-path";
import { cn } from "@/lib/utils";

const localeCodeMap: Record<string, string> = {
  en: "EN",
  ru: "RU",
  lt: "LT",
};

export function LocaleSwitcher({ mode = "name" }: { mode?: "name" | "code" }) {
  const locale = useLocale();
  const t = useTranslations("Locale");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const localeCode = localeCodeMap[locale] ?? locale.toUpperCase();
  const codeOnly = mode === "code";

  const handleSelect = (nextLocale: string) => {
    const nextPath = switchLocalePathname({ pathname, nextLocale });

    const query = searchParams.toString();
    const hash = typeof window === "undefined" ? "" : window.location.hash;

    router.push(`${nextPath}${query ? `?${query}` : ""}${hash}`);
  };

  return (
    <DropdownMenu
      align="start"
      trigger={(triggerProps) => (
        <button
          type="button"
          className={cn(
            "flex h-9 shrink-0 items-center justify-between gap-1 rounded-full border border-border/60 bg-card text-sm text-muted-foreground shadow-sm",
            codeOnly
              ? "w-[4.75rem] px-2"
              : "w-[4.5rem] px-2 sm:w-36 sm:gap-2 sm:px-3",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          )}
          aria-label={t("label")}
          data-layout-key="locale-switcher"
          {...triggerProps}
        >
          <Globe2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          {codeOnly ? (
            <span className="text-xs font-semibold uppercase text-foreground">
              {localeCode}
            </span>
          ) : (
            <>
              <span className="text-[11px] font-semibold uppercase text-foreground sm:hidden">
                {localeCode}
              </span>
              <span className="hidden min-w-0 truncate text-sm font-medium text-foreground sm:inline">
                {t(locale)}
              </span>
            </>
          )}
          <ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />
        </button>
      )}
      contentClassName="min-w-[10rem]"
    >
      {locales.map((entry) => (
        <DropdownMenuItem
          key={entry}
          onSelect={() => handleSelect(entry)}
          data-testid={`locale-option-${entry}`}
          className={entry === locale ? "bg-accent text-accent-foreground" : ""}
        >
          {t(entry)}
        </DropdownMenuItem>
      ))}
    </DropdownMenu>
  );
}
