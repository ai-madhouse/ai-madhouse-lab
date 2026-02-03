"use client";

import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

const options = [
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
  { value: "system", icon: Moon },
] as const;

export function ThemeSwitcher() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const t = useTranslations("Theme");
  const resolvedLabel = t(resolvedTheme ?? "light");

  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map((option) => {
        const isActive = theme === option.value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setTheme(option.value)}
            className={cn(
              "flex items-center justify-center gap-2 rounded-2xl border border-border/60 px-3 py-3 text-sm font-medium transition",
              isActive
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <Icon className="h-4 w-4" aria-label={t(`${option.value}Icon`)} />
            <span className="capitalize">{t(option.value)}</span>
          </button>
        );
      })}
      <p className="col-span-3 mt-1 text-xs text-muted-foreground">
        {t("resolved", { theme: resolvedLabel })}
      </p>
    </div>
  );
}
