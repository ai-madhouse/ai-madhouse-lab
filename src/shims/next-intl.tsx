"use client";

import type React from "react";
import { createContext, useContext, useMemo } from "react";

export type Messages = Record<string, string | Messages>;

const I18nContext = createContext<{
  locale: string;
  messages: Messages;
} | null>(null);

function resolvePath(messages: Messages, key: string): string {
  const parts = key.split(".");
  let current: string | Messages = messages;
  for (const part of parts) {
    if (typeof current !== "object" || current === null) {
      return key;
    }
    const next = (current as Messages)[part];
    if (next === undefined) {
      return key;
    }
    current = next as Messages;
  }
  return typeof current === "string" ? current : key;
}

function interpolate(
  template: string,
  values?: Record<string, string | number>,
): string {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    String(values[key] ?? `{${key}}`),
  );
}

export function NextIntlClientProvider({
  locale,
  messages,
  children,
}: {
  locale: string;
  messages: Messages;
  children: React.ReactNode;
}) {
  const value = useMemo(() => ({ locale, messages }), [locale, messages]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslations(namespace?: string) {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error(
      "useTranslations must be used within NextIntlClientProvider",
    );
  }
  return (key: string, values?: Record<string, string | number>) => {
    const fullKey = namespace ? `${namespace}.${key}` : key;
    const template = resolvePath(context.messages, fullKey);
    return interpolate(template, values);
  };
}

export function useLocale() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useLocale must be used within NextIntlClientProvider");
  }
  return context.locale;
}
