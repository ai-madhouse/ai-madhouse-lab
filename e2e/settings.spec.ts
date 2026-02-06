import { expect, test } from "@playwright/test";

import { registerAndLandOnDashboard } from "./helpers";

test("settings: tabs navigate to key panels", async ({ page }) => {
  const { locale } = await registerAndLandOnDashboard(page, { locale: "en" });

  await page.goto(`/${locale}/settings`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

  await expect(page.getByRole("tab", { name: "Password" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(
    page.getByRole("button", { name: "Change password" }),
  ).toBeVisible();

  await page.getByRole("tab", { name: "Sessions" }).click();
  await expect(page.getByRole("tab", { name: "Sessions" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByText(/^Active sessions:/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sign out everywhere" }).first(),
  ).toBeVisible();

  await page.getByRole("tab", { name: "Appearance" }).click();
  await expect(page.getByRole("tab", { name: "Appearance" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByLabel("Toggle theme")).toBeVisible();

  await page.getByRole("tab", { name: "Language & region" }).click();
  await expect(
    page.getByRole("tab", { name: "Language & region" }),
  ).toHaveAttribute("aria-selected", "true");
  const languagePanel = page.getByRole("tabpanel", {
    name: "Language & region",
  });
  await expect(
    languagePanel.getByRole("button", { name: "Language" }),
  ).toBeVisible();

  await page.getByRole("tab", { name: "Keyboard shortcuts" }).click();
  await expect(
    page.getByRole("tab", { name: "Keyboard shortcuts" }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByRole("button", { name: "Reset to defaults" }),
  ).toBeVisible();
  await expect(page.getByText("Insert link")).toBeVisible();
});

test("sessions endpoints enforce csrf token checks", async ({ page }) => {
  const { locale } = await registerAndLandOnDashboard(page, { locale: "en" });

  await page.goto(`/${locale}/settings?tab=sessions`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByRole("tab", { name: "Sessions" })).toHaveAttribute(
    "aria-selected",
    "true",
  );

  const me = await page.evaluate(async () => {
    const res = await fetch("/api/session/me", { cache: "no-store" });
    const json = (await res.json().catch(() => null)) as
      | { ok: true; sessionId: string }
      | { ok: false; error?: string }
      | null;
    return { status: res.status, json };
  });
  expect(me.status).toBe(200);
  expect(me.json).toMatchObject({ ok: true });
  const meSessionId =
    me.json && "sessionId" in me.json ? me.json.sessionId : undefined;
  expect(meSessionId).toBeTruthy();
  if (!meSessionId) throw new Error("missing session id");

  const revokeNoCsrf = await page.evaluate(async (sessionId) => {
    const res = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}`, {
      method: "DELETE",
    });
    const json = (await res.json().catch(() => null)) as {
      ok: boolean;
      error?: string;
    } | null;
    return { status: res.status, json };
  }, meSessionId);
  expect(revokeNoCsrf.status).toBe(403);
  expect(revokeNoCsrf.json).toMatchObject({
    ok: false,
    error: "csrf",
  });

  const metaNoCsrf = await page.evaluate(async (sessionId) => {
    const res = await fetch("/api/sessions/meta", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId,
        payload_iv: "iv",
        payload_ciphertext: "cipher",
      }),
    });
    const json = (await res.json().catch(() => null)) as {
      ok: boolean;
      error?: string;
    } | null;
    return { status: res.status, json };
  }, meSessionId);
  expect(metaNoCsrf.status).toBe(403);
  expect(metaNoCsrf.json).toMatchObject({
    ok: false,
    error: "csrf",
  });

  const csrfToken = await page.evaluate(async () => {
    const res = await fetch("/api/csrf", { cache: "no-store" });
    const json = (await res.json().catch(() => null)) as
      | { ok: true; token: string }
      | { ok: false; error?: string }
      | null;
    if (!json || !("ok" in json) || !json.ok) return null;
    return json.token;
  });
  expect(csrfToken).toBeTruthy();
  if (!csrfToken) throw new Error("missing csrf token");

  const metaWithCsrf = await page.evaluate(async (token) => {
    const res = await fetch("/api/sessions/meta", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": token,
      },
      body: JSON.stringify({}),
    });
    const json = (await res.json().catch(() => null)) as {
      ok: boolean;
      error?: string;
    } | null;
    return { status: res.status, json };
  }, csrfToken);
  expect(metaWithCsrf.status).toBe(400);
  expect(metaWithCsrf.json).toMatchObject({
    ok: false,
    error: "invalid",
  });

  const revokeWithCsrf = await page.evaluate(
    async ({ sessionId, token }) => {
      const res = await fetch(
        `/api/sessions/${encodeURIComponent(sessionId)}`,
        {
          method: "DELETE",
          headers: {
            "x-csrf-token": token,
          },
        },
      );
      const json = (await res.json().catch(() => null)) as {
        ok: boolean;
        error?: string;
      } | null;
      return { status: res.status, json };
    },
    { sessionId: meSessionId, token: csrfToken },
  );
  expect(revokeWithCsrf.status).toBe(400);
  expect(revokeWithCsrf.json).toMatchObject({
    ok: false,
    error: "cannot delete current session",
  });
});
