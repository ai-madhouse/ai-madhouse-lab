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

  const initialBg = await aboutLink.evaluate(
    (el) => window.getComputedStyle(el).backgroundColor,
  );
  await aboutLink.hover();
  const hoveredBg = await aboutLink.evaluate(
    (el) => window.getComputedStyle(el).backgroundColor,
  );

  expect(hoveredBg).not.toBe(initialBg);

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

  const select = page.locator('select[aria-label="Language"]');
  await expect(select).toBeVisible();

  // We can’t reliably assert native <option> highlight colors cross-browser,
  // but we *can* assert we set classes that force readable colors.
  const optionClasses = await select
    .locator("option")
    .evaluateAll((opts) => opts.map((o) => (o as HTMLOptionElement).className));

  expect(optionClasses.length).toBeGreaterThan(0);
  for (const cls of optionClasses) {
    expect(cls).toContain("bg-background");
    expect(cls).toContain("text-foreground");
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

  const localeSelect = page.locator('select[aria-label="Language"]');
  const themeBtn = page.getByLabel("Toggle theme");

  await expect(logout).toBeVisible();
  await expect(localeSelect).toBeVisible();
  await expect(themeBtn).toBeVisible();

  const before = {
    logout: await logout.boundingBox(),
    locale: await localeSelect.boundingBox(),
    theme: await themeBtn.boundingBox(),
  };

  expect(before.logout).toBeTruthy();
  expect(before.locale).toBeTruthy();
  expect(before.theme).toBeTruthy();

  await themeBtn.click();
  await page.waitForTimeout(150);

  const after = {
    logout: await logout.boundingBox(),
    locale: await localeSelect.boundingBox(),
    theme: await themeBtn.boundingBox(),
  };

  const dx = Math.abs((after.logout!.x ?? 0) - (before.logout!.x ?? 0));
  const dw = Math.abs((after.logout!.width ?? 0) - (before.logout!.width ?? 0));

  expect(dx).toBeLessThanOrEqual(0.5);
  expect(dw).toBeLessThanOrEqual(0.5);
});
