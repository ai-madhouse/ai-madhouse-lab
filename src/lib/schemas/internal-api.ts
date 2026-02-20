import { z } from "zod";

export const apiUnauthorizedErrorSchema = z
  .object({
    ok: z.literal(false),
    error: z.literal("unauthorized"),
  })
  .strict();

export const csrfEndpointResponseSchema = z
  .object({
    ok: z.literal(true),
    token: z.string().min(1),
  })
  .strict();

export const sessionMeSuccessResponseSchema = z
  .object({
    ok: z.literal(true),
    sessionId: z.string().min(1),
    ip: z.string(),
  })
  .strict();

export const notesEventKindSchema = z.enum([
  "create",
  "update",
  "delete",
  "undo",
  "redo",
]);

export const notesHistoryGetEventSchema = z
  .object({
    id: z.string().min(1),
    username: z.string().min(1),
    created_at: z.string().min(1),
    kind: notesEventKindSchema,
    note_id: z.string().min(1),
    target_event_id: z.string().nullable(),
    payload_iv: z.string().nullable(),
    payload_ciphertext: z.string().nullable(),
  })
  .strict();

export const notesHistoryGetSuccessResponseSchema = z
  .object({
    ok: z.literal(true),
    events: z.array(notesHistoryGetEventSchema),
  })
  .strict();

export const notesHistoryPostRequestSchema = z
  .object({
    kind: notesEventKindSchema,
    note_id: z.string().nullish(),
    target_event_id: z.string().nullish(),
    payload_iv: z.string().nullish(),
    payload_ciphertext: z.string().nullish(),
  })
  .superRefine((value, ctx) => {
    if (!value.note_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "note_id required",
        path: ["note_id"],
      });
    }

    if (
      (value.kind === "undo" || value.kind === "redo") &&
      !value.target_event_id
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "target_event_id required",
        path: ["target_event_id"],
      });
    }

    if (
      (value.kind === "create" || value.kind === "update") &&
      (!value.payload_iv || !value.payload_ciphertext)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "payload required",
        path: ["payload_iv"],
      });
    }
  });

export const notesHistoryPostErrorCodeSchema = z.enum([
  "unauthorized",
  "csrf",
  "rate",
  "invalid kind",
  "note_id required",
  "target_event_id required",
  "payload required",
]);

export const notesHistoryPostErrorResponseSchema = z
  .object({
    ok: z.literal(false),
    error: notesHistoryPostErrorCodeSchema,
  })
  .strict();

export const notesHistoryPostSuccessResponseSchema = z
  .object({
    ok: z.literal(true),
    id: z.string().min(1),
  })
  .strict();

export const notesStreamHelloEventSchema = z
  .object({
    event: z.literal("hello"),
    data: z
      .object({
        ok: z.literal(true),
      })
      .strict(),
  })
  .strict();

export const notesStreamChangedEventSchema = z
  .object({
    event: z.literal("notes:changed"),
    data: z
      .object({
        id: z.string().nullable(),
      })
      .strict(),
  })
  .strict();

export const notesStreamPingEventSchema = z
  .object({
    event: z.literal("ping"),
    data: z
      .object({
        ts: z.number(),
      })
      .strict(),
  })
  .strict();

export const cspReportE2EDisabledResponseSchema = z
  .object({
    ok: z.literal(false),
    error: z.literal("not_found"),
  })
  .strict();

export const cspReportNormalizedReportSchema = z
  .object({
    type: z.string(),
    blocked: z.string().optional(),
    document: z.string().optional(),
    effectiveDirective: z.string().optional(),
    violatedDirective: z.string().optional(),
    disposition: z.string().optional(),
    statusCode: z.number().optional(),
  })
  .strict();

export const cspReportE2EEntrySchema = z
  .object({
    at: z.number(),
    reports: z.array(cspReportNormalizedReportSchema),
  })
  .strict();

export const cspReportE2EEnabledResponseSchema = z
  .object({
    ok: z.literal(true),
    count: z.number().int().nonnegative(),
    last: cspReportE2EEntrySchema.nullable(),
  })
  .strict();
