import { expect, test } from "@playwright/test";

import { registerAndLandOnDashboard } from "./helpers";

test.setTimeout(120_000);

test("CSP reporting pipeline: POST report + verify server stores redacted sample", async ({
  page,
  request,
}) => {
  await registerAndLandOnDashboard(page, { locale: "en" });

  // Ensure the e2e-only page exists (guard rails).
  await page.goto("/en/csp-test", { waitUntil: "domcontentloaded" });
  await expect(page.getByText(/CSP probe/i)).toBeVisible();

  // Send a synthetic report (mimics Reporting API payload).
  const postRes = await request.post("/api/csp-report", {
    headers: { "content-type": "application/reports+json" },
    data: [
      {
        type: "csp-violation",
        body: {
          "document-uri": "https://site.test/a?token=1#x",
          "blocked-uri": "https://evil.test/b.js?sig=2#y",
          "violated-directive": "connect-src",
        },
      },
    ],
  });
  expect(postRes.status()).toBe(204);

  // Verify the server stored a redacted version (E2E_TEST mode only).
  const getRes = await request.get("/api/csp-report");
  expect(getRes.status()).toBe(200);

  const json = (await getRes.json()) as {
    ok: true;
    count: number;
    last: null | {
      at: number;
      reports: Array<{ document?: string; blocked?: string }>;
    };
  };

  expect(json.ok).toBe(true);
  expect(json.count).toBeGreaterThan(0);

  const last = json.last;
  expect(last).toBeTruthy();
  expect(last?.reports?.[0]?.document).toBe("https://site.test/a");
  expect(last?.reports?.[0]?.blocked).toBe("https://evil.test/b.js");
});
