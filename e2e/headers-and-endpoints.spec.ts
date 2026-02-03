import { expect, test } from "@playwright/test";

import { registerAndLandOnDashboard } from "./helpers";

test("CSP present on authenticated pages too", async ({ page }) => {
  await registerAndLandOnDashboard(page, { locale: "en" });

  const res = await page.goto("/en/dashboard", { waitUntil: "networkidle" });
  expect(res).toBeTruthy();

  const headers = res!.headers();
  expect(headers["content-security-policy"]).toContain("report-to csp");
  expect(headers["reporting-endpoints"]).toBe('csp="/api/csp-report"');
});

test("/api/csp-report returns 204 to a sample report payload", async ({
  request,
}) => {
  const res = await request.post("/api/csp-report", {
    headers: { "content-type": "application/reports+json" },
    data: [
      {
        type: "csp-violation",
        body: {
          "document-uri": "https://site.test/a?token=1#x",
          "blocked-uri": "https://cdn.test/b.js?sig=2#y",
          "violated-directive": "script-src",
        },
      },
    ],
  });

  expect(res.status()).toBe(204);
});
