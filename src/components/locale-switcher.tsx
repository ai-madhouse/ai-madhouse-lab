"use client";

import { ChevronDown, Globe2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { locales } from "@/lib/i18n";
import { switchLocalePathname } from "@/lib/locale-path";
import { cn } from "@/lib/utils";

export function LocaleSwitcher() {
  const locale = useLocale();
  const t = useTranslations("Locale");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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
            "flex shrink-0 items-center gap-2 rounded-full border border-border/60 bg-card px-3 py-2 text-sm text-muted-foreground shadow-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          )}
          aria-label={t("label")}
          {...triggerProps}
        >
          <Globe2 className="h-4 w-4" aria-hidden="true" />
          <span className="text-sm font-medium text-foreground">
            {t(locale)}
          </span>
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
      contentClassName="min-w-[10rem]"
    >
      {locales.map((entry) => (
        <DropdownMenuItem
          key={entry}
          onSelect={() => handleSelect(entry)}
          className={entry === locale ? "bg-accent text-accent-foreground" : ""}
        >
          {t(entry)}
        </DropdownMenuItem>
      ))}
    </DropdownMenu>
  );
}
