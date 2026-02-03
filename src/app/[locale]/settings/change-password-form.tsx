"use client";

import { useState } from "react";

import { PasswordRequirements } from "@/components/auth/password-requirements";
import { CsrfTokenField } from "@/components/csrf/csrf-token-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePasswordFormSchema } from "@/lib/schemas/auth";

export function ChangePasswordForm({
  action,
  title,
  currentPasswordLabel,
  newPasswordLabel,
  confirmPasswordLabel,
  submitLabel,
}: {
  action: (formData: FormData) => void;
  title: string;
  currentPasswordLabel: string;
  newPasswordLabel: string;
  confirmPasswordLabel: string;
  submitLabel: string;
}) {
  const [nextPassword, setNextPassword] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);

  return (
    <form
      action={action}
      className="space-y-4"
      onSubmit={(e) => {
        const form = e.currentTarget;
        const fd = new FormData(form);

        const parsed = changePasswordFormSchema.safeParse({
          csrfToken: String(fd.get("csrfToken") ?? ""),
          currentPassword: String(fd.get("currentPassword") ?? ""),
          newPassword: String(fd.get("newPassword") ?? ""),
          newPassword2: String(fd.get("newPassword2") ?? ""),
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

      {clientError ? (
        <div
          className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          {clientError}
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="currentPassword">{currentPasswordLabel}</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="newPassword">{newPasswordLabel}</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          onChange={(e) => setNextPassword(e.target.value)}
        />
        <PasswordRequirements password={nextPassword} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="newPassword2">{confirmPasswordLabel}</Label>
        <Input
          id="newPassword2"
          name="newPassword2"
          type="password"
          autoComplete="new-password"
          required
        />
      </div>

      <Button type="submit">{submitLabel}</Button>

      <p className="text-xs text-muted-foreground">{title}</p>
    </form>
  );
}
