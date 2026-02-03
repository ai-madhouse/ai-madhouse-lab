import { expect, test } from "@playwright/test";

import { registerAndLandOnDashboard } from "./helpers";

test("CSP + Reporting-Endpoints headers present in production", async ({
  page,
}) => {
  const res = await page.goto("/en", { waitUntil: "networkidle" });
  expect(res).toBeTruthy();

  const headers = res?.headers();
  expect(headers).toBeTruthy();

  // CSP should be set by proxy middleware in production.
  expect(headers!["content-security-policy"]).toContain("report-to csp");
  expect(headers!["content-security-policy"]).toContain(
    "report-uri /api/csp-report",
  );

  // Reporting API mapping
  expect(headers!["reporting-endpoints"]).toBe('csp="/api/csp-report"');
});

test("Theme toggle does not shift the logout button", async ({ page }) => {
  await registerAndLandOnDashboard(page, { locale: "en" });

  const logout = page
    .locator("button", { hasText: "Sign out" })
    .filter({ hasNotText: "everywhere" })
    .first();
  await expect(logout).toBeVisible();

  const boxBefore = await logout.boundingBox();
  expect(boxBefore).toBeTruthy();

  // Toggle theme
  await page.getByLabel("Toggle theme").click();
  await page.waitForTimeout(150);

  const boxAfter = await logout.boundingBox();
  expect(boxAfter).toBeTruthy();

  const dx = Math.abs((boxAfter!.x ?? 0) - (boxBefore!.x ?? 0));
  const dw = Math.abs((boxAfter!.width ?? 0) - (boxBefore!.width ?? 0));

  // Very small tolerance; should be stable now that toggle is fixed-width.
  expect(dx).toBeLessThanOrEqual(0.5);
  expect(dw).toBeLessThanOrEqual(0.5);
});
