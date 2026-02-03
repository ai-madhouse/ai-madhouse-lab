"use client";

import { Globe2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import type React from "react";
import { locales } from "@/lib/i18n";
import { switchLocalePathname } from "@/lib/locale-path";

export function LocaleSwitcher() {
  const locale = useLocale();
  const t = useTranslations("Locale");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextLocale = event.target.value;
    const nextPath = switchLocalePathname({ pathname, nextLocale });

    const query = searchParams.toString();
    const hash = typeof window === "undefined" ? "" : window.location.hash;

    router.push(`${nextPath}${query ? `?${query}` : ""}${hash}`);
  };

  return (
    <label className="flex items-center gap-2 rounded-full border border-border/60 bg-card px-3 py-2 text-sm text-muted-foreground">
      <Globe2 className="h-4 w-4" aria-label={t("icon")} />
      <span className="sr-only">{t("label")}</span>
      <select
        value={locale}
        onChange={handleChange}
        className="bg-transparent text-sm font-medium text-foreground outline-none"
        aria-label={t("label")}
      >
        {locales.map((entry) => (
          <option key={entry} value={entry}>
            {t(entry)}
          </option>
        ))}
      </select>
    </label>
  );
}
