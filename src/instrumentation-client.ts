import * as Sentry from "@sentry/nextjs";

export async function register() {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,

    // Keep noise low; CSP reporting has its own pipeline.
    tracesSampleRate: 0,

    // Do not send PII by default.
    sendDefaultPii: false,

    // Avoid initializing Sentry when DSN is not configured.
    enabled: Boolean(process.env.SENTRY_DSN),
  });
}

// Required by @sentry/nextjs to instrument client-side navigations.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
