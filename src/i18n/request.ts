import { getRequestConfig } from "next-intl/server";

import { getMessages, normalizeLocale } from "@/lib/i18n";

export default getRequestConfig(async (ctx) => {
  const maybeLocale =
    (ctx && "locale" in ctx ? (ctx.locale as unknown) : null) ??
    (ctx && "requestLocale" in ctx
      ? await (ctx.requestLocale as Promise<unknown>)
      : null);

  const normalized = normalizeLocale(
    typeof maybeLocale === "string" ? maybeLocale : null,
  );
  const messages = await getMessages(normalized);

  return {
    locale: normalized,
    messages,
  };
});
