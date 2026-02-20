import { expect, type Page, test } from "@playwright/test";

import { registerAndLandOnDashboard } from "./helpers";

const locales = ["en", "ru", "lt"] as const;

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

  const landingLink = page.locator('[data-layout-key="nav-home"]');
  const aboutLink = page.locator('[data-layout-key="nav-about"]');

  await expect(landingLink).toHaveAttribute("aria-current", "page");
  await expect(landingLink).toHaveAttribute("data-active", "true");
  await expect(aboutLink).not.toHaveAttribute("aria-current", "page");
  await expect(aboutLink).toHaveAttribute("data-active", "false");

  await aboutLink.click();
  await expect(page).toHaveURL(/\/en\/about$/);
  await expect(aboutLink).toHaveAttribute("aria-current", "page");
  await expect(aboutLink).toHaveAttribute("data-active", "true");

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

test("locale switcher opens via menu semantics and preserves route/query/hash", async ({
  page,
}) => {
  await page.goto("/en/about?from=contract#header-contract", {
    waitUntil: "networkidle",
  });

  const localeTrigger = page.locator('[data-layout-key="locale-switcher"]');
  await expect(localeTrigger).toBeVisible();
  await expect(localeTrigger).toHaveAttribute("aria-haspopup", "menu");
  await expect(localeTrigger).toHaveAttribute("aria-expanded", "false");

  await localeTrigger.click();
  await expect(localeTrigger).toHaveAttribute("aria-expanded", "true");

  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("menuitem")).toHaveCount(3);

  await page.getByTestId("locale-option-ru").click();
  await expect(page).toHaveURL("/ru/about?from=contract#header-contract");
  await expect(page.getByRole("menu")).toHaveCount(0);
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

  const logout = page.locator('[data-layout-key="header-auth"]');
  const localeSwitcher = page.locator('[data-layout-key="locale-switcher"]');
  const themeBtn = page.locator('[data-layout-key="theme-toggle"]');
  const html = page.locator("html");

  await expect(logout).toHaveCount(1);
  await expect(localeSwitcher).toHaveCount(1);
  await expect(themeBtn).toHaveCount(1);

  const before = {
    logout: await logout.boundingBox(),
    locale: await localeSwitcher.boundingBox(),
    theme: await themeBtn.boundingBox(),
  };

  expect(before.logout).toBeTruthy();
  expect(before.locale).toBeTruthy();
  expect(before.theme).toBeTruthy();

  const darkBefore = await html.evaluate((el) => el.classList.contains("dark"));
  await themeBtn.click();
  await expect
    .poll(async () => html.evaluate((el) => el.classList.contains("dark")))
    .not.toBe(darkBefore);

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

test("dashboard realtime indicator stays connected for a healthy websocket", async ({
  page,
}) => {
  await page.addInitScript(() => {
    class MockWebSocket {
      static readonly CONNECTING = 0;
      static readonly OPEN = 1;
      static readonly CLOSING = 2;
      static readonly CLOSED = 3;

      readonly url: string;
      readyState = MockWebSocket.CONNECTING;
      onopen: ((this: WebSocket, ev: Event) => unknown) | null = null;
      onclose: ((this: WebSocket, ev: CloseEvent) => unknown) | null = null;
      onerror: ((this: WebSocket, ev: Event) => unknown) | null = null;
      onmessage: ((this: WebSocket, ev: MessageEvent) => unknown) | null = null;

      constructor(url: string) {
        this.url = url;

        setTimeout(() => {
          this.readyState = MockWebSocket.OPEN;
          this.onopen?.call(this as unknown as WebSocket, new Event("open"));
        }, 20);
      }

      close() {
        if (this.readyState === MockWebSocket.CLOSED) return;
        this.readyState = MockWebSocket.CLOSED;
        this.onclose?.call(
          this as unknown as WebSocket,
          new CloseEvent("close", {
            code: 1000,
            reason: "test-close",
            wasClean: true,
          }),
        );
      }

      send(_data: string | Blob | ArrayBuffer | ArrayBufferView) {}
      addEventListener() {}
      removeEventListener() {}
      dispatchEvent() {
        return true;
      }
    }

    Object.defineProperty(window, "WebSocket", {
      value: MockWebSocket,
      configurable: true,
      writable: true,
    });
  });

  await registerAndLandOnDashboard(page, { locale: "en" });

  const realtimeCard = page.getByTestId("dashboard-realtime-card");
  const statusLabel = realtimeCard.getByTestId("realtime-status-label");
  const statusDetail = realtimeCard.getByTestId("realtime-status-detail");

  await expect(realtimeCard).toBeVisible();
  await expect(statusDetail).toContainText(
    /Opening realtime websocket|connected to realtime/,
  );
  await expect(statusLabel).toHaveText("Connected");
  await expect(statusDetail).toHaveText(
    "This browser is connected to realtime.",
  );
  await expect
    .poll(async () => await statusDetail.textContent(), { timeout: 1_000 })
    .toBe("This browser is connected to realtime.");
});
