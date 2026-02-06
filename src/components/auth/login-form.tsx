"use client";

import Link from "next/link";
import { useState } from "react";

import { CsrfTokenField } from "@/components/csrf/csrf-token-field";
import { Button } from "@/components/roiui/button";
import { Input } from "@/components/roiui/input";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormError, FormField } from "@/components/ui/form";
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
    <>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {hasError ? <FormError>{errorText}</FormError> : null}
        {clientError ? <FormError>{clientError}</FormError> : null}

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

          <FormField id="username" label={usernameLabel}>
            <Input
              name="username"
              placeholder={usernamePlaceholder}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
            />
          </FormField>

          <FormField id="password" label={passwordLabel}>
            <Input
              name="password"
              type="password"
              placeholder={passwordPlaceholder}
              autoComplete="current-password"
              required
            />
          </FormField>

          <Button type="submit" className="w-full">
            {submitLabel}
          </Button>

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
      </CardContent>
    </>
  );
}
