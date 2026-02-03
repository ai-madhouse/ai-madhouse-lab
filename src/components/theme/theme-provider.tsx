"use client";

import { ThemeProvider as BaseThemeProvider } from "next-themes";

export function ThemeProvider({
  children,
  attribute,
  defaultTheme,
  storageKey,
}: {
  children: React.ReactNode;
  attribute?: "class" | "data-theme";
  defaultTheme?: "light" | "dark" | "system";
  storageKey?: string;
}) {
  return (
    <BaseThemeProvider
      attribute={attribute}
      defaultTheme={defaultTheme}
      storageKey={storageKey}
    >
      {children}
    </BaseThemeProvider>
  );
}
