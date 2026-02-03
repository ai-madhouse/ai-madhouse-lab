import { z } from "zod";

import { normalizeLocale } from "@/lib/i18n";
import { passwordSchema, usernameSchema } from "@/lib/validation/users";

export const zLocale = z
  .string()
  .default("en")
  .transform((v) => normalizeLocale(String(v ?? "en")));

export const zUsername = usernameSchema;
export const zPassword = passwordSchema;

export const zCsrfToken = z.string().min(1, "csrf missing");

export const zNext = z.string().optional().default("");

export const loginFormSchema = z.object({
  locale: zLocale,
  next: zNext,
  username: zUsername,
  password: z.string().min(1, "password required"),
  csrfToken: zCsrfToken,
});

export const registerFormSchema = z
  .object({
    locale: zLocale,
    next: zNext,
    username: zUsername,
    password: zPassword,
    password2: z.string().min(1, "password confirmation required"),
    csrfToken: zCsrfToken,
  })
  .superRefine(({ password, password2 }, ctx) => {
    if (password !== password2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "passwords_mismatch",
        path: ["password2"],
      });
    }
  });

export const changePasswordFormSchema = z
  .object({
    csrfToken: zCsrfToken,
    currentPassword: z.string().min(1, "current password required"),
    newPassword: zPassword,
    newPassword2: z.string().min(1, "password confirmation required"),
  })
  .superRefine(({ newPassword, newPassword2 }, ctx) => {
    if (newPassword !== newPassword2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "passwords_mismatch",
        path: ["newPassword2"],
      });
    }
  });
