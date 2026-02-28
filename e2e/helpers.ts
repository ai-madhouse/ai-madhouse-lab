import { expect, type Page } from "@playwright/test";

let userCounter = 0;

export function uniqueUser() {
  userCounter += 1;
  const runId = (process.env.PW_E2E_RUN_ID || "localrun")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "");
  const suffix = `${runId.slice(-12)}_${String(userCounter).padStart(4, "0")}`;
  return {
    username: `pw_${suffix}`.slice(0, 32),
    password: `Aa1!${suffix}zzZZ`,
  };
}

export async function registerAndLandOnDashboard(
  page: Page,
  opts?: { locale?: string },
) {
  const locale = opts?.locale ?? "en";
  const { username, password } = uniqueUser();
  const csrfToken = await fetchCsrfToken(page);
  const registerRes = await page.request.post("/api/auth/register", {
    form: {
      locale,
      next: `/${locale}/dashboard`,
      username,
      password,
      password2: password,
      csrfToken,
    },
  });
  expect(registerRes.ok()).toBe(true);

  await page.goto(`/${locale}/dashboard`, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(new RegExp(`/${locale}/dashboard`));

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
  await expect(
    page.locator('input[name="csrfToken"][type="hidden"]'),
  ).toHaveValue(/\S+/);

  await page.locator('input[name="username"]').fill(username);
  await page.locator('input[name="password"]').first().fill(password);
  await page.locator('button[type="submit"]').first().click();

  await expect(page).toHaveURL(new RegExp(`/${locale}/dashboard`));
}

export async function signOutFromHeader(page: Page, locale: string) {
  const signOut = page.locator('[data-layout-key="header-auth"]');
  await expect(signOut).toBeVisible();
  await signOut.click();
  try {
    await expect(page).toHaveURL(new RegExp(`/${locale}/login`), {
      timeout: 6_000,
    });
  } catch {
    await page.goto(`/${locale}/logout`, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(new RegExp(`/${locale}/login`));
  }
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
