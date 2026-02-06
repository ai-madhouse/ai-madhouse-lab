"use client";

import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { Button } from "@/components/roiui/button";

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
      className="h-9 w-9 shrink-0 rounded-full p-0"
      aria-label={t("toggle")}
      title={t("toggle")}
    >
      {isDark ? (
        <Sun className="h-4 w-4" aria-label={t("lightIcon")} />
      ) : (
        <Moon className="h-4 w-4" aria-label={t("darkIcon")} />
      )}
      <span className="sr-only">{isDark ? t("light") : t("dark")}</span>
    </Button>
  );
}
