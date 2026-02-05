import * as Sentry from "@sentry/nextjs";

const sentryOptions: Parameters<typeof Sentry.init>[0] = {
  dsn: process.env.SENTRY_DSN,

  // Keep noise low; CSP reporting has its own pipeline.
  tracesSampleRate: 0,

  // Do not send PII by default.
  sendDefaultPii: false,

  // Avoid initializing Sentry when DSN is not configured.
  enabled: Boolean(process.env.SENTRY_DSN),
};

export async function register() {
  // Next.js calls `register()` in the appropriate runtime.
  // See: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init(sentryOptions);
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init(sentryOptions);
  }
}

// Required by @sentry/nextjs to capture errors from nested React Server Components.
export const onRequestError = Sentry.captureRequestError;
