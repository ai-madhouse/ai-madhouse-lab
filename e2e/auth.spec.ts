import { expect, test } from "@playwright/test";

import { registerAndLandOnDashboard } from "./helpers";

test("can register, see settings, and sign out", async ({ page }) => {
  const { locale } = await registerAndLandOnDashboard(page, { locale: "en" });

  await page
    .locator("header nav")
    .getByRole("link", { name: "Settings" })
    .click();
  await expect(page).toHaveURL(new RegExp(`/${locale}/settings`));

  // The header sign out button should work.
  await page
    .locator("button", { hasText: "Sign out" })
    .filter({ hasNotText: "everywhere" })
    .first()
    .click();

  await expect(page).toHaveURL(new RegExp(`/${locale}/login`));
});
