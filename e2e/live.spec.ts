import { expect, test } from "@playwright/test";

import { registerAndLandOnDashboard } from "./helpers";

test("live: pulse stream loads and updates footer", async ({ page }) => {
  const { locale } = await registerAndLandOnDashboard(page, { locale: "en" });

  // This page uses streaming; networkidle can hang.
  await page.goto(`/${locale}/live`, { waitUntil: "domcontentloaded" });

  await expect(
    page.getByRole("heading", { name: "Live signals" }).first(),
  ).toBeVisible();

  // Footer text should update over time.
  const footer = page.getByText(/Last update:/i);
  await expect(footer).toBeVisible();

  const first = (await footer.textContent()) ?? "";
  await expect
    .poll(
      async () => {
        const next = (await footer.textContent()) ?? "";
        return next !== first;
      },
      { timeout: 10_000 },
    )
    .toBe(true);
});
