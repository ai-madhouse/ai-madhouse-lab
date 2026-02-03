import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Keep noise low; CSP reporting has its own pipeline.
  tracesSampleRate: 0,

  // Do not send PII by default.
  sendDefaultPii: false,
});
