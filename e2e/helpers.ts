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

  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);

  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(new RegExp(`/${locale}/dashboard`));

  return { username, password, locale };
}
