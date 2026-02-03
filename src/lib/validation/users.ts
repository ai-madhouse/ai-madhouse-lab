import { z } from "zod";

export function normalizeUsername(raw: string) {
  return raw.trim().toLowerCase();
}

export const usernameSchema = z
  .string()
  .transform((v) => normalizeUsername(String(v ?? "")))
  .superRefine((username, ctx) => {
    if (username.length < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "username too short",
      });
      return;
    }

    if (username.length > 32) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "username too long",
      });
      return;
    }

    if (!/^[a-z0-9._-]+$/.test(username)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "username must use a-z, 0-9, dot, underscore, dash",
      });
    }
  });

export const passwordSchema = z.string().superRefine((password, ctx) => {
  if (password.length < 12) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "password must be at least 12 characters",
    });
    return;
  }

  if (password.length > 200) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "password too long" });
    return;
  }

  if (!/[A-Z]/.test(password)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "password must include a capital letter",
    });
    return;
  }

  if (!/[a-z]/.test(password)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "password must include a lowercase letter",
    });
    return;
  }

  if (!/\d/.test(password)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "password must include a digit",
    });
    return;
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "password must include a special character",
    });
  }
});
