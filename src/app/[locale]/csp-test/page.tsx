import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { isAuthenticated } from "@/lib/auth";

import { CspViolationProbe } from "./probe";

export default async function CspTestPage() {
  // This route exists to validate CSP reporting in automated tests.
  // In normal usage it should not be exposed.
  if (process.env.E2E_TEST !== "1") {
    return <div className="p-6">Not found</div>;
  }

  const isAuthed = await isAuthenticated();

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader isAuthed={isAuthed} />
      <main className="mx-auto w-full max-w-3xl space-y-6 px-6 py-12">
        <h1 className="text-2xl font-semibold">CSP probe</h1>
        <p className="text-sm text-muted-foreground">
          This page intentionally triggers CSP violations so browsers send
          reports to <code>/api/csp-report</code>.
        </p>
        <CspViolationProbe />
      </main>
      <SiteFooter />
    </div>
  );
}
