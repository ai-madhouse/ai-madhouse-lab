"use client";

import {
  Activity,
  LayoutDashboard,
  LogIn,
  LogOut,
  NotebookPen,
  Settings,
  Sparkles,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const iconMap = {
  home: Sparkles,
  dashboard: LayoutDashboard,
  settings: Settings,
  live: Activity,
  notes: NotebookPen,
  about: Sparkles,
} as const;

export function SiteHeader({ isAuthed = false }: { isAuthed?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("Nav");

  const navItems = [
    { key: "home", href: `/${locale}` },
    { key: "dashboard", href: `/${locale}/dashboard` },
    { key: "settings", href: `/${locale}/settings` },
    { key: "live", href: `/${locale}/live` },
    { key: "notes", href: `/${locale}/notes` },
    { key: "about", href: `/${locale}/about` },
  ] as const;

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" aria-label={t("brandIcon")} />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {t("eyebrow")}
            </p>
            <p className="text-lg font-semibold">{t("brand")}</p>
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-2">
          {navItems.map((item) => {
            const Icon = iconMap[item.key];
            const active = pathname === item.href;
            return (
              <Link
                key={item.key}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Icon className="h-4 w-4" aria-label={t(`${item.key}Icon`)} />
                {t(item.key)}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <LocaleSwitcher />
          <ThemeToggle />

          {!isAuthed ? (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => router.push(`/${locale}/register`)}
            >
              <UserPlus className="h-4 w-4" aria-label={t("registerIcon")} />
              {t("register")}
            </Button>
          ) : null}

          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              if (isAuthed) {
                try {
                  window.localStorage.removeItem("madhouse-notes-undo");
                  window.localStorage.removeItem("madhouse-notes-redo");
                } catch {
                  // ignore
                }
              }

              router.push(`/${locale}/${isAuthed ? "logout" : "login"}`);
            }}
          >
            {isAuthed ? (
              <LogOut className="h-4 w-4" aria-label={t("logoutIcon")} />
            ) : (
              <LogIn className="h-4 w-4" aria-label={t("loginIcon")} />
            )}
            {isAuthed ? t("logout") : t("login")}
          </Button>
        </div>
      </div>
    </header>
  );
}
