"use client";

import { Globe2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import type React from "react";
import { locales } from "@/lib/i18n";

export function LocaleSwitcher() {
  const locale = useLocale();
  const t = useTranslations("Locale");
  const router = useRouter();
  const pathname = usePathname();

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextLocale = event.target.value;
    const segments = pathname.split("/");
    if (segments.length > 1) {
      segments[1] = nextLocale;
    }
    const nextPath = segments.join("/") || `/${nextLocale}`;
    router.push(nextPath);
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
