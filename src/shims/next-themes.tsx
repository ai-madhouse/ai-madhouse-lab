"use client";

import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type Theme = "light" | "dark" | "system";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: "light" | "dark";
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeProvider({
  children,
  attribute = "class",
  defaultTheme = "system",
  storageKey = "theme",
}: {
  children: React.ReactNode;
  attribute?: "class" | "data-theme";
  defaultTheme?: Theme;
  storageKey?: string;
}) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored =
      typeof window === "undefined"
        ? null
        : window.localStorage.getItem(storageKey);
    if (stored === "light" || stored === "dark" || stored === "system") {
      setThemeState(stored);
    }
  }, [storageKey]);

  useEffect(() => {
    const nextResolved = theme === "system" ? getSystemTheme() : theme;
    setResolvedTheme(nextResolved);

    if (typeof document !== "undefined") {
      const root = document.documentElement;
      if (attribute === "class") {
        root.classList.remove("light", "dark");
        root.classList.add(nextResolved);
      } else {
        root.setAttribute(attribute, nextResolved);
      }
    }
  }, [attribute, theme]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (theme === "system") {
        setResolvedTheme(getSystemTheme());
      }
    };
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = useCallback(
    (next: Theme) => {
      setThemeState(next);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(storageKey, next);
      }
    },
    [storageKey],
  );

  const value = useMemo(
    () => ({ theme, setTheme, resolvedTheme }),
    [resolvedTheme, setTheme, theme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
