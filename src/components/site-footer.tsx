"use client";

import { useTranslations } from "next-intl";

export function SiteFooter() {
  const t = useTranslations("Footer");

  return (
    <footer
      className="border-t border-border/60 bg-background"
      data-layout-key="site-footer"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-6 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>{t("summary")}</p>
        <p>{t("version", { version: "0.1" })}</p>
      </div>
    </footer>
  );
}
