"use client";

import Link from "next/link";
import { useState } from "react";

import { PasswordFields } from "@/components/auth/password-fields";
import { CsrfTokenField } from "@/components/csrf/csrf-token-field";
import { Input } from "@/components/roiui/input";
import { Button } from "@/components/ui/button";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { registerFormSchema } from "@/lib/schemas/auth";

export function RegisterForm({
  action,
  locale,
  nextPath,
  error,
  errorText,
  title,
  subtitle,
  usernameLabel,
  passwordLabel,
  password2Label,
  submitLabel,
  haveAccountText,
  signInText,
}: {
  action: (formData: FormData) => void;
  locale: string;
  nextPath: string;
  error: string | undefined;
  errorText: string;
  title: string;
  subtitle: string;
  usernameLabel: string;
  passwordLabel: string;
  password2Label: string;
  submitLabel: string;
  haveAccountText: string;
  signInText: string;
}) {
  const [clientError, setClientError] = useState<string | null>(null);

  return (
    <>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error ? (
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

            const parsed = registerFormSchema.safeParse({
              locale: String(fd.get("locale") ?? ""),
              next: String(fd.get("next") ?? ""),
              username: String(fd.get("username") ?? ""),
              password: String(fd.get("password") ?? ""),
              password2: String(fd.get("password2") ?? ""),
              csrfToken: String(fd.get("csrfToken") ?? ""),
            });

            if (!parsed.success) {
              const first = parsed.error.issues[0];
              setClientError(first?.message ?? "Please check the form fields.");
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
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
            />
          </div>

          <PasswordFields
            passwordId="password"
            passwordName="password"
            password2Id="password2"
            password2Name="password2"
            passwordLabel={passwordLabel}
            password2Label={password2Label}
          />

          <Button type="submit" className="w-full">
            {submitLabel}
          </Button>

          <p className="text-sm text-muted-foreground">
            {haveAccountText}{" "}
            <Link
              href={`/${locale}/login?next=${encodeURIComponent(nextPath)}`}
              className="underline"
            >
              {signInText}
            </Link>
          </p>
        </form>
      </CardContent>
    </>
  );
}
