"use client";

import { useState } from "react";
import { PasswordRequirements } from "@/components/auth/password-requirements";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
      <div className="space-y-2">
        <Label htmlFor={passwordId}>{passwordLabel}</Label>
        <Input
          id={passwordId}
          name={passwordName}
          type="password"
          autoComplete="new-password"
          required
          onChange={(e) => setPassword(e.target.value)}
        />
        <PasswordRequirements password={password} />
      </div>

      <div className="space-y-2">
        <Label htmlFor={password2Id}>{password2Label}</Label>
        <Input
          id={password2Id}
          name={password2Name}
          type="password"
          autoComplete="new-password"
          required
        />
      </div>
    </div>
  );
}
