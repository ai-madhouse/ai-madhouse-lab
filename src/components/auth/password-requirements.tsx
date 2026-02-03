"use client";

import { Check, X } from "lucide-react";

import { cn } from "@/lib/utils";

function hasLower(value: string) {
  return /[a-z]/.test(value);
}

function hasUpper(value: string) {
  return /[A-Z]/.test(value);
}

function hasDigit(value: string) {
  return /\d/.test(value);
}

function hasSpecial(value: string) {
  return /[^A-Za-z0-9]/.test(value);
}

export function passwordRequirements(password: string) {
  return {
    minLen12: password.length >= 12,
    lower: hasLower(password),
    upper: hasUpper(password),
    digit: hasDigit(password),
    special: hasSpecial(password),
  };
}

export function PasswordRequirements({ password }: { password: string }) {
  const req = passwordRequirements(password);

  const items = [
    { ok: req.minLen12, label: "12 characters total" },
    { ok: req.upper, label: "one capital letter" },
    { ok: req.lower, label: "one lowercase letter" },
    { ok: req.digit, label: "one digit" },
    { ok: req.special, label: "one special character" },
  ];

  return (
    <div className="space-y-1">
      {items.map((item) => (
        <div
          key={item.label}
          className={cn(
            "flex items-center gap-2 text-sm",
            item.ok ? "text-emerald-600" : "text-muted-foreground",
          )}
        >
          {item.ok ? (
            <Check className="h-4 w-4" aria-label="met" />
          ) : (
            <X className="h-4 w-4" aria-label="missing" />
          )}
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
