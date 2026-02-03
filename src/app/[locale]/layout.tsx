import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { getMessages, locales, normalizeLocale } from "@/lib/i18n";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  const normalizedLocale = normalizeLocale(params.locale);
  const messages = await getMessages(normalizedLocale);

  return (
    <NextIntlClientProvider locale={normalizedLocale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
