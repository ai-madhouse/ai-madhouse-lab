export const locales = ["en", "ru", "lt"] as const;
export type Locale = (typeof locales)[number];

const messages = {
  en: () => import("@/messages/en.json").then((m) => m.default),
  ru: () => import("@/messages/ru.json").then((m) => m.default),
  lt: () => import("@/messages/lt.json").then((m) => m.default),
} satisfies Record<Locale, () => Promise<Record<string, unknown>>>;

export async function getMessages(locale: Locale) {
  return messages[locale]();
}

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function normalizeLocale(value?: string | null): Locale {
  if (value && isLocale(value)) {
    return value;
  }
  return "en";
}

export function getLocaleFromPath(pathname: string): Locale {
  const segment = pathname.split("/").filter(Boolean)[0];
  return normalizeLocale(segment);
}
