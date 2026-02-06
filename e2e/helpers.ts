import { expect, type Page } from "@playwright/test";

export function uniqueUser() {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return {
    username: `pw_${suffix}`.slice(0, 24),
    password: `Aa1!${suffix}zzZZ`,
  };
}

export async function registerAndLandOnDashboard(
  page: Page,
  opts?: { locale?: string },
) {
  const locale = opts?.locale ?? "en";
  const { username, password } = uniqueUser();

  await page.goto(`/${locale}/register`, { waitUntil: "networkidle" });

  await page.locator('input[name="username"]').fill(username);
  await page.locator('input[name="password"]').first().fill(password);
  await page.locator('input[name="password2"]').fill(password);

  await page.locator('button[type="submit"]').first().click();
  await expect(page).toHaveURL(new RegExp(`/${locale}/dashboard`));

  return { username, password, locale };
}
