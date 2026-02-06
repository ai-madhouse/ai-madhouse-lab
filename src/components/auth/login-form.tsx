"use client";

import Link from "next/link";
import { useState } from "react";

import { CsrfTokenField } from "@/components/csrf/csrf-token-field";
import { Input } from "@/components/roiui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { loginFormSchema } from "@/lib/schemas/auth";

export function LoginForm({
  action,
  locale,
  nextPath,
  hasError,
  errorText,
  title,
  subtitle,
  usernameLabel,
  usernamePlaceholder,
  passwordLabel,
  passwordPlaceholder,
  submitLabel,
  noAccountText,
  registerLinkText,
}: {
  action: (formData: FormData) => void;
  locale: string;
  nextPath: string;
  hasError: boolean;
  errorText: string;
  title: string;
  subtitle: string;
  usernameLabel: string;
  usernamePlaceholder: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  submitLabel: string;
  noAccountText: string;
  registerLinkText: string;
}) {
  const [clientError, setClientError] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-lg font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>

      {hasError ? (
        <div
          className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          {errorText}
        </div>
      ) : null}

      {clientError ? (
        <div
          className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          {clientError}
        </div>
      ) : null}

      <form
        action={action}
        className="space-y-4"
        onSubmit={(e) => {
          const form = e.currentTarget;
          const fd = new FormData(form);

          const parsed = loginFormSchema.safeParse({
            locale: String(fd.get("locale") ?? ""),
            next: String(fd.get("next") ?? ""),
            username: String(fd.get("username") ?? ""),
            password: String(fd.get("password") ?? ""),
            csrfToken: String(fd.get("csrfToken") ?? ""),
          });

          if (!parsed.success) {
            // Keep it generic to avoid leaking rules on the client.
            setClientError("Please check the form fields.");
            e.preventDefault();
          } else {
            setClientError(null);
          }
        }}
      >
        <CsrfTokenField />
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="next" value={nextPath} />

        <div className="space-y-2">
          <Label htmlFor="username">{usernameLabel}</Label>
          <Input
            id="username"
            name="username"
            placeholder={usernamePlaceholder}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">{passwordLabel}</Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder={passwordPlaceholder}
            autoComplete="current-password"
            required
          />
        </div>

        <Button className="w-full">{submitLabel}</Button>

        <p className="text-sm text-muted-foreground">
          {noAccountText}{" "}
          <Link
            href={`/${locale}/register?next=${encodeURIComponent(nextPath)}`}
            className="underline"
          >
            {registerLinkText}
          </Link>
        </p>
      </form>
    </div>
  );
}
