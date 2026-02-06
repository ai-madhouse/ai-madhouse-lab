"use client";

import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

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
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        {options.map((option) => {
          const isActive = theme === option.value;
          const Icon = option.icon;

          return (
            <Button
              key={option.value}
              type="button"
              size="unset"
              radius="2xl"
              variant={isActive ? "primary" : "surface"}
              aria-pressed={isActive}
              onClick={() => setTheme(option.value)}
              className={
                isActive
                  ? "h-12 w-full border border-border/60 px-3"
                  : "h-12 w-full px-3"
              }
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span className="capitalize">{t(option.value)}</span>
            </Button>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        {t("resolved", { theme: resolvedLabel })}
      </p>
    </div>
  );
}
