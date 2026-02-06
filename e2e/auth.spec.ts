import { expect, type Page, test } from "@playwright/test";

import {
  registerAndLandOnDashboard,
  signInFromLoginPage,
  signOutFromHeader,
  uniqueUser,
} from "./helpers";

async function sessionMeStatusFromBrowser(page: Page) {
  return await page.evaluate(async () => {
    const res = await fetch("/api/session/me", { cache: "no-store" });
    return res.status;
  });
}

test("can register, see settings, and sign out", async ({ page }) => {
  const { locale } = await registerAndLandOnDashboard(page, { locale: "en" });

  expect(await sessionMeStatusFromBrowser(page)).toBe(200);

  await page
    .locator("header nav")
    .getByRole("link", { name: "Settings" })
    .click();
  await expect(page).toHaveURL(new RegExp(`/${locale}/settings`));

  await signOutFromHeader(page, locale);

  expect(await sessionMeStatusFromBrowser(page)).toBe(401);
});

test("register rejects tampered csrf token", async ({ page }) => {
  const locale = "en";
  const { username, password } = uniqueUser();

  await page.goto(`/${locale}/register`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);

  const csrfField = page.locator('input[name="csrfToken"]');
  await expect(csrfField).toHaveValue(/\S+/);
  await csrfField.evaluate((node, token) => {
    (node as HTMLInputElement).value = token;
  }, "tampered-register-csrf");

  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(new RegExp(`/${locale}/register\\?error=csrf`));
});

test("login rejects tampered csrf token then succeeds with fresh token", async ({
  page,
}) => {
  const { locale, username, password } = await registerAndLandOnDashboard(
    page,
    {
      locale: "en",
    },
  );
  await signOutFromHeader(page, locale);

  await page.goto(`/${locale}/login`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password", { exact: true }).fill(password);

  const csrfField = page.locator('input[name="csrfToken"]');
  await expect(csrfField).toHaveValue(/\S+/);
  await csrfField.evaluate((node, token) => {
    (node as HTMLInputElement).value = token;
  }, "tampered-login-csrf");

  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/${locale}/login\\?error=csrf`));

  await signInFromLoginPage({
    page,
    locale,
    username,
    password,
  });
});
