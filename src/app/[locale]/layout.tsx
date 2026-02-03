import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { getMessages, locales, normalizeLocale } from "@/lib/i18n";

// CSP nonces require per-request rendering so Next can inject nonce attributes.
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const normalizedLocale = normalizeLocale(locale);
  const messages = await getMessages(normalizedLocale);

  return (
    <NextIntlClientProvider locale={normalizedLocale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
