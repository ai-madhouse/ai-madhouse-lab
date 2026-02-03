"use client";

import { useState } from "react";

export function CspViolationProbe() {
  const [status, setStatus] = useState<string>("idle");

  async function triggerViolation() {
    setStatus("triggering");

    // Some Chromium builds (especially headless shells) are flaky about the
    // Reporting API / CSP report delivery. To make reports useful anyway, we
    // capture the browser's CSP violation event and forward a minimal payload
    // to our own /api/csp-report endpoint.
    const onViolation = async (e: SecurityPolicyViolationEvent) => {
      try {
        console.log(
          "csp-test: violation",
          JSON.stringify({
            documentURI: e.documentURI,
            blockedURI: e.blockedURI,
            violatedDirective: e.violatedDirective,
            effectiveDirective: e.effectiveDirective,
            disposition: e.disposition,
          }),
        );

        const res = await fetch("/api/csp-report", {
          method: "POST",
          headers: { "content-type": "application/reports+json" },
          body: JSON.stringify([
            {
              type: "csp-violation",
              body: {
                "document-uri": e.documentURI,
                "blocked-uri": e.blockedURI,
                "violated-directive": e.violatedDirective,
                "effective-directive": e.effectiveDirective,
                disposition: e.disposition,
              },
            },
          ]),
        });

        console.log("csp-test: report sent", String(res.status));
        setStatus("reported");
      } catch {
        setStatus("report-failed");
      } finally {
        window.removeEventListener("securitypolicyviolation", onViolation);
      }
    };

    window.addEventListener("securitypolicyviolation", onViolation, {
      once: true,
    });

    // Trigger a reliable violation with our CSP:
    // connect-src 'self'
    // So a cross-origin fetch should violate.
    void fetch("https://example.com/", { mode: "no-cors" }).catch(() => {
      // ignore
    });
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border/60 bg-card p-5">
      <p className="text-sm font-medium">Status: {status}</p>
      <button
        type="button"
        onClick={triggerViolation}
        className="inline-flex h-9 items-center justify-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground"
      >
        Trigger CSP violation
      </button>
    </div>
  );
}
