import { expect, type Page, test } from "@playwright/test";

import { registerAndLandOnDashboard } from "./helpers";

const locales = ["en", "ru", "lt"] as const;

async function readLayoutKeys(page: Page, rootName: string) {
  return page.evaluate((name) => {
    const root = document.querySelector<HTMLElement>(
      `[data-layout-root="${name}"]`,
    );
    if (!root) return [];

    const nodes = [
      root,
      ...Array.from(root.querySelectorAll<HTMLElement>("[data-layout-key]")),
    ];

    return nodes
      .map((node) => node.getAttribute("data-layout-key"))
      .filter((value): value is string => Boolean(value));
  }, rootName);
}

async function expectNoHorizontalOverflow(page: Page) {
  const sizes = await page.evaluate(() => {
    const html = document.documentElement;
    const body = document.body;
    const maxScrollWidth = Math.max(html.scrollWidth, body?.scrollWidth ?? 0);

    return {
      maxScrollWidth,
      viewportWidth: window.innerWidth,
    };
  });

  expect(sizes.maxScrollWidth).toBeLessThanOrEqual(sizes.viewportWidth + 1);
}

test("top nav updates active link and supports keyboard focus state", async ({
  page,
}) => {
  await page.goto("/en", { waitUntil: "networkidle" });

  const landingLink = page.getByRole("link", { name: "Landing" });
  const aboutLink = page.getByRole("link", { name: "About" });

  await expect(landingLink).toHaveClass(/bg-primary/);
  await expect(aboutLink).toHaveClass(/text-muted-foreground/);

  await aboutLink.click();
  await expect(page).toHaveURL(/\/en\/about$/);
  await expect(aboutLink).toHaveClass(/bg-primary/);

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

test("landing layout stays structurally stable across locales", async ({
  page,
}) => {
  for (const locale of locales) {
    await test.step(`landing locale: ${locale}`, async () => {
      await page.goto(`/${locale}`, { waitUntil: "networkidle" });
      await expect(page.getByRole("banner")).toBeVisible();
      await expect(page.getByRole("main")).toBeVisible();
      await expectNoHorizontalOverflow(page);
    });
  }
});

test("theme toggle keeps header controls stable (layout regression)", async ({
  page,
}) => {
  await registerAndLandOnDashboard(page, { locale: "en" });

  const logout = page.locator("header").getByRole("button", { name: /Sign out/i });

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

test("dashboard + top bar stay structurally stable across locales", async ({
  page,
}) => {
  for (const locale of locales) {
    await test.step(`dashboard locale: ${locale}`, async () => {
      await page.context().clearCookies();
      await registerAndLandOnDashboard(page, { locale });
      await expect(page.getByRole("banner")).toBeVisible();
      await expect(page.getByRole("main")).toBeVisible();
      await expectNoHorizontalOverflow(page);
    });
  }
});
