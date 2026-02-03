import { expect, test } from "@playwright/test";

import { registerAndLandOnDashboard } from "./helpers";

test("notes: unlock E2EE and create a note", async ({ page }) => {
  const { locale } = await registerAndLandOnDashboard(page, { locale: "en" });

  // Notes uses background fetches; networkidle can hang.
  await page.goto(`/${locale}/notes`, { waitUntil: "domcontentloaded" });

  await expect(
    page.locator("main").getByRole("heading", { name: "Notes" }).first(),
  ).toBeVisible();

  // Unlock notes (E2EE DEK). If there is no key yet, this path shows setup.
  const passphrase = "CorrectHorseBatteryStaple1!";

  // Setup passphrase (first time): there should be two inputs and a create button.
  // We use placeholder text because this card is not fully i18n'd yet.
  const setupInput = page.getByPlaceholder(/Set an E2EE passphrase/i);
  const unlockInput = page.getByPlaceholder(/Enter your E2EE passphrase/i);

  // Wait for either setup or unlock view to appear (avoid race on first paint).
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

  // Now the Create note inputs should be enabled.
  await expect(page.getByPlaceholder("Title")).toBeEnabled();

  await page.getByPlaceholder("Title").fill("pw note");

  // Use the editor textarea if present; fallback to any textarea.
  const body = page.getByPlaceholder(/Body/i);
  await body.fill("hello from playwright");

  await page.getByRole("button", { name: /^Create$/ }).click();

  // Note should appear in the list.
  await expect(page.locator('input[value="pw note"]')).toBeVisible();
});
