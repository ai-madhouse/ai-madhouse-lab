"use client";

import { useState } from "react";
import { PasswordRequirements } from "@/components/auth/password-requirements";
import { Input } from "@/components/roiui/input";
import { FormField } from "@/components/ui/form";

export function PasswordFields({
  passwordId,
  passwordName,
  password2Id,
  password2Name,
  passwordLabel,
  password2Label,
}: {
  passwordId: string;
  passwordName: string;
  password2Id: string;
  password2Name: string;
  passwordLabel: string;
  password2Label: string;
}) {
  const [password, setPassword] = useState("");

  return (
    <div className="space-y-4">
      <FormField
        id={passwordId}
        label={passwordLabel}
        hint={<PasswordRequirements password={password} />}
      >
        <Input
          name={passwordName}
          type="password"
          autoComplete="new-password"
          required
          onChange={(e) => setPassword(e.target.value)}
        />
      </FormField>

      <FormField id={password2Id} label={password2Label}>
        <Input
          name={password2Name}
          type="password"
          autoComplete="new-password"
          required
        />
      </FormField>
    </div>
  );
}
