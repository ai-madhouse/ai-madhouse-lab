import { expect, test } from "@playwright/test";

import {
  getFormCsrfToken,
  registerAndLandOnDashboard,
  sessionMeStatusFromBrowser,
  setFormCsrfToken,
  signInFromLoginPage,
  signOutFromHeader,
  uniqueUser,
} from "./helpers";

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

  await setFormCsrfToken(page, "tampered-register-csrf");

  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(new RegExp(`/${locale}/register\\?error=csrf`));
});

test("register rejects missing csrf token", async ({ browser, page }) => {
  const locale = "en";
  const { username, password } = uniqueUser();
  await page.goto(`/${locale}/login`, { waitUntil: "domcontentloaded" });
  const origin = new URL(page.url()).origin;

  const noJsContext = await browser.newContext({
    baseURL: origin,
    javaScriptEnabled: false,
  });
  const noJsPage = await noJsContext.newPage();

  await noJsPage.goto(`/${locale}/register`, { waitUntil: "domcontentloaded" });
  await noJsPage.getByLabel("Username").fill(username);
  await noJsPage.getByLabel("Password", { exact: true }).fill(password);
  await noJsPage.getByLabel("Confirm password").fill(password);
  await noJsPage.getByRole("button", { name: "Create account" }).click();
  await expect(noJsPage).toHaveURL(
    new RegExp(`/${locale}/register\\?error=csrf`),
  );
  await noJsContext.close();
});

test("login rejects missing csrf token", async ({ browser, page }) => {
  const { locale, username, password } = await registerAndLandOnDashboard(
    page,
    {
      locale: "en",
    },
  );
  await signOutFromHeader(page, locale);
  const origin = new URL(page.url()).origin;

  const noJsContext = await browser.newContext({
    baseURL: origin,
    javaScriptEnabled: false,
  });
  const noJsPage = await noJsContext.newPage();

  await noJsPage.goto(`/${locale}/login`, { waitUntil: "domcontentloaded" });
  await noJsPage.getByLabel("Username").fill(username);
  await noJsPage.getByLabel("Password", { exact: true }).fill(password);
  await noJsPage.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(noJsPage).toHaveURL(new RegExp(`/${locale}/login\\?error=csrf`));
  await noJsContext.close();
});

test("login rejects stale csrf token", async ({ browser, page }) => {
  const { locale, username, password } = await registerAndLandOnDashboard(
    page,
    {
      locale: "en",
    },
  );
  await signOutFromHeader(page, locale);
  const origin = new URL(page.url()).origin;

  const staleContext = await browser.newContext({ baseURL: origin });
  const stalePage = await staleContext.newPage();
  await stalePage.goto(`/${locale}/login`, { waitUntil: "domcontentloaded" });
  const staleToken = await getFormCsrfToken(stalePage);
  await staleContext.close();

  await page.goto(`/${locale}/login`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password", { exact: true }).fill(password);
  const freshToken = await getFormCsrfToken(page);
  expect(freshToken).not.toBe(staleToken);
  await setFormCsrfToken(page, staleToken);

  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/${locale}/login\\?error=csrf`));
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

  await setFormCsrfToken(page, "tampered-login-csrf");

  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/${locale}/login\\?error=csrf`));

  await signInFromLoginPage({
    page,
    locale,
    username,
    password,
  });
});

test("logout clears auth cookie and session endpoint returns unauthorized", async ({
  page,
}) => {
  const { locale } = await registerAndLandOnDashboard(page, { locale: "en" });
  expect(await sessionMeStatusFromBrowser(page)).toBe(200);

  await page.goto(`/${locale}/logout`, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(new RegExp(`/${locale}/login`));
  expect(await sessionMeStatusFromBrowser(page)).toBe(401);

  await page.goto(`/${locale}/logout`, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(new RegExp(`/${locale}/login`));
});

test("session endpoint rejects missing and tampered auth cookies", async ({
  page,
  context,
  browser,
}) => {
  const { locale } = await registerAndLandOnDashboard(page, { locale: "en" });
  expect(await sessionMeStatusFromBrowser(page)).toBe(200);

  const origin = new URL(page.url()).origin;

  const unauthContext = await browser.newContext({ baseURL: origin });
  const unauthPage = await unauthContext.newPage();
  await unauthPage.goto(`/${locale}/login`, { waitUntil: "domcontentloaded" });
  expect(await sessionMeStatusFromBrowser(unauthPage)).toBe(401);
  await unauthContext.close();

  const authCookie = (await context.cookies()).find(
    (cookie) => cookie.name === "madhouse_auth",
  );
  expect(authCookie).toBeTruthy();
  if (!authCookie) throw new Error("missing auth cookie");

  const tamperedContext = await browser.newContext({ baseURL: origin });
  await tamperedContext.addCookies([
    {
      name: authCookie.name,
      value: `${authCookie.value}x`,
      domain: authCookie.domain,
      path: authCookie.path,
      expires: authCookie.expires,
      httpOnly: authCookie.httpOnly,
      secure: authCookie.secure,
      sameSite: authCookie.sameSite,
    },
  ]);

  const tamperedPage = await tamperedContext.newPage();
  await tamperedPage.goto(`/${locale}/login`, {
    waitUntil: "domcontentloaded",
  });
  expect(await sessionMeStatusFromBrowser(tamperedPage)).toBe(401);
  await tamperedContext.close();
});
