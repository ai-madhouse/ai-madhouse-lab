"use client";

import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const t = useTranslations("Theme");
  const isDark = resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="rounded-full"
      aria-label={t("toggle")}
    >
      {isDark ? (
        <Sun className="h-4 w-4" aria-label={t("lightIcon")} />
      ) : (
        <Moon className="h-4 w-4" aria-label={t("darkIcon")} />
      )}
      <span className="hidden text-xs sm:inline">
        {isDark ? t("light") : t("dark")}
      </span>
    </Button>
  );
}
