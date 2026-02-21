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

async function gotoNotes(page: Page, locale: string) {
  await page.goto(`/${locale}/notes`, { waitUntil: "domcontentloaded" });
  await expect(
    page.locator("main").getByRole("heading", { name: "Notes" }).first(),
  ).toBeVisible();
}

async function ensureNotesUnlocked(page: Page, passphrase: string) {
  const titleInput = page.getByRole("textbox", { name: "Title" });
  await expect(titleInput).toBeVisible();

  try {
    await expect(titleInput).toBeEnabled({ timeout: 5_000 });
    return;
  } catch {
    // no-op: continue with setup/unlock flow
  }

  const setupInput = page.getByPlaceholder(/Set an E2EE passphrase/i);
  const unlockInput = page.getByPlaceholder(/Enter your E2EE passphrase/i);

  const mode = await Promise.race([
    setupInput
      .waitFor({ state: "visible", timeout: 10_000 })
      .then(() => "setup" as const),
    unlockInput
      .waitFor({ state: "visible", timeout: 10_000 })
      .then(() => "unlock" as const),
  ]);

  if (mode === "setup") {
    await setupInput.fill(passphrase);
    await page.getByPlaceholder(/Confirm passphrase/i).fill(passphrase);
    await page.getByRole("button", { name: "Create & unlock" }).click();
  } else {
    await unlockInput.fill(passphrase);
    await page.getByRole("button", { name: /^Unlock$/i }).click();
  }

  await expect(titleInput).toBeEnabled();
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

test("top nav shows localized bottom tooltip for icon-only links", async ({
  page,
}) => {
  await page.goto("/en", { waitUntil: "networkidle" });

  const landingLink = page.locator('[data-layout-key="nav-home"]');
  await landingLink.hover();

  const tooltip = page.getByRole("tooltip", { name: "Landing" });
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toHaveClass(/top-full/);

  await landingLink.focus();
  await expect(landingLink).toBeFocused();
  await expect(tooltip).toBeVisible();
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

test("notes create sends string payload fields and persists after reload", async ({
  page,
}) => {
  const { locale } = await registerAndLandOnDashboard(page, { locale: "en" });
  const passphrase = "CorrectHorseBatteryStaple1!";
  const seed = Date.now().toString(36);
  const title = `pw notes validation ${seed}`;
  const body = "notes create regression coverage";
  const createPayloads: Array<{
    note_id?: unknown;
    payload_iv?: unknown;
    payload_ciphertext?: unknown;
  }> = [];

  await page.route("**/api/notes-history", async (route) => {
    const request = route.request();
    if (request.method() !== "POST") {
      await route.continue();
      return;
    }

    const raw = request.postData();
    if (!raw) {
      await route.continue();
      return;
    }

    let parsed: { kind?: unknown } | null = null;
    try {
      parsed = JSON.parse(raw) as { kind?: unknown } | null;
    } catch {
      await route.continue();
      return;
    }
    if (parsed?.kind === "create") {
      createPayloads.push(parsed);
    }
    await route.continue();
  });

  await gotoNotes(page, locale);
  await ensureNotesUnlocked(page, passphrase);

  await page.getByRole("textbox", { name: "Title" }).fill(title);
  await page.getByRole("textbox", { name: "Body (Markdown)" }).fill(body);
  await page
    .getByRole("button", { name: /^Create$/ })
    .first()
    .click();

  const noteButton = page.getByRole("button", { name: `Open note: ${title}` });
  await expect(noteButton).toBeVisible();

  await expect.poll(() => createPayloads.length, { timeout: 5_000 }).toBe(1);
  const createPayload = createPayloads[0];
  expect(typeof createPayload.note_id).toBe("string");
  if (typeof createPayload.note_id !== "string") {
    throw new Error("Expected create payload note_id to be a string");
  }
  expect(createPayload.note_id.length).toBeGreaterThan(0);
  expect(typeof createPayload.payload_iv).toBe("string");
  if (typeof createPayload.payload_iv !== "string") {
    throw new Error("Expected create payload payload_iv to be a string");
  }
  expect(createPayload.payload_iv.length).toBeGreaterThan(0);
  expect(typeof createPayload.payload_ciphertext).toBe("string");
  if (typeof createPayload.payload_ciphertext !== "string") {
    throw new Error(
      "Expected create payload payload_ciphertext to be a string",
    );
  }
  expect(createPayload.payload_ciphertext.length).toBeGreaterThan(0);

  await page.reload({ waitUntil: "domcontentloaded" });
  await ensureNotesUnlocked(page, passphrase);
  await expect(noteButton).toBeVisible();
});

test("dashboard realtime indicator handles disconnect and reconnect transitions", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const wsInstances: MockWebSocket[] = [];
    Object.defineProperty(window, "__mockRealtimeWsInstances", {
      value: wsInstances,
      configurable: true,
      writable: false,
    });

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
        wsInstances.push(this);

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
  await page.evaluate(() => {
    const sockets = (
      window as Window & {
        __mockRealtimeWsInstances?: Array<{ close: () => void }>;
      }
    ).__mockRealtimeWsInstances;
    if (!Array.isArray(sockets)) return;
    for (const socket of sockets) socket.close();
    sockets.splice(0, sockets.length);
  });
  await expect
    .poll(() => statusLabel.textContent(), { timeout: 3_000 })
    .toBe("Disconnected");
  await expect(statusDetail).toHaveText(
    "This browser is not connected to realtime.",
  );
  await expect
    .poll(() => statusLabel.textContent(), { timeout: 3_000 })
    .toBe("Connected");
  await expect(statusDetail).toHaveText(
    "This browser is connected to realtime.",
  );
  await expect
    .poll(async () => await statusDetail.textContent(), { timeout: 1_000 })
    .toBe("This browser is connected to realtime.");
});
