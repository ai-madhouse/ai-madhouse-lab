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
  await expect(
    page.locator('input[name="csrfToken"][type="hidden"]'),
  ).toHaveValue(/.+/);

  await page.locator('input[name="username"]').fill(username);
  await page.locator('input[name="password"]').first().fill(password);
  await page.locator('input[name="password2"]').fill(password);
  await page.locator('button[type="submit"]').first().click();

  await signInFromLoginPage({ page, locale, username, password });

  return { username, password, locale };
}

export async function signInFromLoginPage({
  page,
  locale = "en",
  username,
  password,
  nextPath,
}: {
  page: Page;
  locale?: string;
  username: string;
  password: string;
  nextPath?: string;
}) {
  const targetNext = nextPath ?? `/${locale}/dashboard`;
  await page.goto(`/${locale}/login?next=${encodeURIComponent(targetNext)}`, {
    waitUntil: "domcontentloaded",
  });

  await page.locator('input[name="username"]').fill(username);
  await page.locator('input[name="password"]').first().fill(password);
  await page.locator('button[type="submit"]').first().click();

  await expect(page).toHaveURL(new RegExp(`/${locale}/dashboard`));
}

export async function signOutFromHeader(page: Page, locale: string) {
  const signOut = page.locator('[data-layout-key="header-auth"]');
  await expect(signOut).toBeVisible();
  await signOut.click();
  await expect(page).toHaveURL(new RegExp(`/${locale}/login`));
}

export async function fetchCsrfToken(page: Page) {
  const res = await page.request.get("/api/csrf");
  expect(res.ok()).toBe(true);

  const json = (await res.json()) as
    | { ok: true; token: string }
    | { ok: false; error?: string };

  expect(json.ok).toBe(true);
  if (!json.ok) throw new Error(json.error || "csrf fetch failed");
  return json.token;
}

export async function getFormCsrfToken(page: Page) {
  const csrfField = page.locator('input[name="csrfToken"]');
  await expect(csrfField).toHaveValue(/\S+/);
  return await csrfField.inputValue();
}

export async function setFormCsrfToken(page: Page, token: string) {
  const csrfField = page.locator('input[name="csrfToken"]');
  await csrfField.evaluate((node, nextToken) => {
    (node as HTMLInputElement).value = nextToken;
  }, token);
}

export async function sessionMeStatusFromBrowser(page: Page) {
  return await page.evaluate(async () => {
    const res = await fetch("/api/session/me", { cache: "no-store" });
    return res.status;
  });
}
