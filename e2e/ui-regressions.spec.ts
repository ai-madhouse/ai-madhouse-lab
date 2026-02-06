import { expect, test } from "@playwright/test";

import { registerAndLandOnDashboard } from "./helpers";

test("top nav updates active link and supports keyboard focus state", async ({
  page,
}) => {
  await page.goto("/en", { waitUntil: "networkidle" });

  const landingLink = page.getByRole("link", { name: "Landing" });
  const aboutLink = page.getByRole("link", { name: "About" });

  await expect(landingLink).toHaveAttribute("aria-current", "page");
  await expect(aboutLink).not.toHaveAttribute("aria-current", "page");

  await aboutLink.click();
  await expect(page).toHaveURL(/\/en\/about$/);
  await expect(aboutLink).toHaveAttribute("aria-current", "page");

  const inactiveLink = page.getByRole("link", { name: "Landing" });
  await expect(inactiveLink).toHaveClass(/hover:bg-accent/);

  const landingOnAboutPage = page.getByRole("link", { name: "Landing" });

  for (let i = 0; i < 12; i += 1) {
    if (
      await landingOnAboutPage.evaluate((el) => el === document.activeElement)
    )
      break;
    await page.keyboard.press("Tab");
  }

  await expect(landingOnAboutPage).toBeFocused();
  const isFocusVisible = await landingOnAboutPage.evaluate((el) =>
    el.matches(":focus-visible"),
  );
  expect(isFocusVisible).toBe(true);
});

test("locale switcher has dark-mode-safe option styling", async ({ page }) => {
  await page.goto("/en", { waitUntil: "networkidle" });

  const localeTrigger = page.getByRole("button", { name: "Language" });
  await expect(localeTrigger).toBeVisible();
  await localeTrigger.click();

  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible();
  const optionClasses = await menu
    .getByRole("menuitem")
    .evaluateAll((items) => items.map((item) => item.className));

  expect(optionClasses.length).toBeGreaterThan(0);
  for (const cls of optionClasses) {
    expect(
      cls.includes("text-foreground") || cls.includes("text-accent-foreground"),
    ).toBe(true);
    expect(cls).toContain("hover:bg-accent");
  }
});

test("theme toggle keeps header controls stable (layout regression)", async ({
  page,
}) => {
  await registerAndLandOnDashboard(page, { locale: "en" });

  const logout = page
    .locator("button", { hasText: "Sign out" })
    .filter({ hasNotText: "everywhere" })
    .first();

  const localeSwitcher = page.getByRole("button", { name: "Language" });
  const themeBtn = page.getByLabel("Toggle theme");

  await expect(logout).toBeVisible();
  await expect(localeSwitcher).toBeVisible();
  await expect(themeBtn).toBeVisible();

  const before = {
    logout: await logout.boundingBox(),
    locale: await localeSwitcher.boundingBox(),
    theme: await themeBtn.boundingBox(),
  };

  expect(before.logout).toBeTruthy();
  expect(before.locale).toBeTruthy();
  expect(before.theme).toBeTruthy();

  await themeBtn.click();
  await page.waitForTimeout(150);

  const after = {
    logout: await logout.boundingBox(),
    locale: await localeSwitcher.boundingBox(),
    theme: await themeBtn.boundingBox(),
  };

  const dx = Math.abs((after.logout!.x ?? 0) - (before.logout!.x ?? 0));
  const dw = Math.abs((after.logout!.width ?? 0) - (before.logout!.width ?? 0));

  expect(dx).toBeLessThanOrEqual(0.5);
  expect(dw).toBeLessThanOrEqual(0.5);
});
