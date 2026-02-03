"use client";

import { useState } from "react";

import { PasswordRequirements } from "@/components/auth/password-requirements";
import { CsrfTokenField } from "@/components/csrf/csrf-token-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

  return (
    <form action={action} className="space-y-4">
      <CsrfTokenField />

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
