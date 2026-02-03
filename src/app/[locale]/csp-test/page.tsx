import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { isAuthenticated } from "@/lib/auth";

import { CspViolationProbe } from "./probe";

function getSentrySecurityCspEndpoint(): string | null {
  const dsn = (process.env.SENTRY_DSN || "").trim();
  if (!dsn) return null;

  try {
    const u = new URL(dsn);
    const publicKey = u.username;
    const host = u.host;
    const projectId = u.pathname.replace(/^\//, "");

    if (!publicKey || !host || !projectId) return null;

    return `https://${host}/api/${projectId}/security/?sentry_key=${publicKey}`;
  } catch {
    return null;
  }
}

export default async function CspTestPage() {
  // This route exists to validate CSP reporting in automated tests.
  // In normal usage it should not be exposed.
  if (process.env.E2E_TEST !== "1") {
    return <div className="p-6">Not found</div>;
  }

  const isAuthed = await isAuthenticated();
  const sentryEndpoint = getSentrySecurityCspEndpoint();

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader isAuthed={isAuthed} />
      <main className="mx-auto w-full max-w-3xl space-y-6 px-6 py-12">
        <h1 className="text-2xl font-semibold">CSP probe</h1>
        <p className="text-sm text-muted-foreground">
          This page intentionally triggers CSP violations so browsers send
          reports to <code>/api/csp-report</code>.
        </p>
        <CspViolationProbe sentryEndpoint={sentryEndpoint} />
      </main>
      <SiteFooter />
    </div>
  );
}
