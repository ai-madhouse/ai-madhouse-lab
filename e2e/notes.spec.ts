import { expect, test, type Page } from "@playwright/test";

import { registerAndLandOnDashboard } from "./helpers";

async function gotoNotes(page: Page, locale: string) {
  // Notes uses background fetches; networkidle can hang.
  await page.goto(`/${locale}/notes`, { waitUntil: "domcontentloaded" });

  await expect(
    page.locator("main").getByRole("heading", { name: "Notes" }).first(),
  ).toBeVisible();
}

async function ensureNotesUnlocked(page: Page, passphrase: string) {
  const titleInput = page.getByPlaceholder("Title").first();
  await expect(titleInput).toBeVisible();

  // If we already have a cached DEK, the form may enable shortly after load.
  try {
    await expect(titleInput).toBeEnabled({ timeout: 5_000 });
    return;
  } catch {
    // fall through to manual unlock
  }

  // Unlock notes (E2EE DEK). If there is no key yet, this path shows setup.
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

  await expect(titleInput).toBeEnabled();
}

function noteOpenButton(page: Page, title: string) {
  return page.getByRole("button", { name: `Open note: ${title}` });
}

function noteCard(page: Page, title: string) {
  return noteOpenButton(page, title).locator("..");
}

function reorderHandleFor(page: Page, title: string) {
  return noteCard(page, title).getByRole("button", { name: "Reorder note" });
}

async function createNote(page: Page, title: string, body: string) {
  await page.getByPlaceholder("Title").first().fill(title);
  await page.getByPlaceholder(/Body/i).first().fill(body);
  await page.getByRole("button", { name: /^Create$/ }).click();
  await expect(noteOpenButton(page, title)).toBeVisible();
}

async function otherSectionTitles(page: Page) {
  const section = page.locator('section[aria-labelledby="notes-other-heading"]');
  await expect(section).toBeVisible();

  const titles = await section
    .getByRole("button", { name: /^Open note:/ })
    .evaluateAll((nodes) =>
      nodes
        .map((node) => node.getAttribute("aria-label") || "")
        .map((label) => label.replace(/^Open note:\\s*/, ""))
        .filter(Boolean),
    );

  return titles;
}

test("notes: pin, edit, delete, reorder persists", async ({ page }) => {
  const { locale } = await registerAndLandOnDashboard(page, { locale: "en" });

  const passphrase = "CorrectHorseBatteryStaple1!";

  const noteToMutate = "pw note 1";
  const noteTwo = "pw note 2";
  const noteThree = "pw note 3";

  await test.step("open notes page", async () => {
    await gotoNotes(page, locale);
  });

  await test.step("unlock notes (E2EE)", async () => {
    await ensureNotesUnlocked(page, passphrase);
  });

  await test.step("create notes", async () => {
    await createNote(page, noteToMutate, "hello from playwright");
    await createNote(page, noteTwo, "second note");
    await createNote(page, noteThree, "third note");
  });

  await test.step("pin and unpin", async () => {
    await noteOpenButton(page, noteToMutate).click();
    const viewDialog = page.getByRole("dialog", { name: noteToMutate });
    await expect(viewDialog).toBeVisible();

    await viewDialog.getByRole("button", { name: /^Pin$/ }).click();
    await viewDialog.getByRole("button", { name: "Close" }).click();

    const pinnedSection = page.locator(
      'section[aria-labelledby="notes-pinned-heading"]',
    );
    await expect(pinnedSection).toBeVisible();
    await expect(
      pinnedSection.getByRole("button", {
        name: `Open note: ${noteToMutate}`,
      }),
    ).toBeVisible();

    await pinnedSection
      .getByRole("button", { name: `Open note: ${noteToMutate}` })
      .click();
    const viewDialogPinned = page.getByRole("dialog", { name: noteToMutate });
    await expect(viewDialogPinned).toBeVisible();

    await viewDialogPinned.getByRole("button", { name: /^Unpin$/ }).click();
    await viewDialogPinned.getByRole("button", { name: "Close" }).click();

    await expect(pinnedSection).toHaveCount(0);
    await expect(
      page
        .locator('section[aria-labelledby="notes-other-heading"]')
        .getByRole("button", { name: `Open note: ${noteToMutate}` }),
    ).toBeVisible();
  });

  const editedTitle = "pw note 1 edited";
  const editedBody = "edited body from playwright";

  await test.step("open, edit, save", async () => {
    await noteOpenButton(page, noteToMutate).click();
    const viewDialog = page.getByRole("dialog", { name: noteToMutate });
    await expect(viewDialog).toBeVisible();

    await viewDialog.getByRole("button", { name: /^Edit$/ }).click();

    const editDialog = page.getByRole("dialog", { name: "Edit note" });
    await expect(editDialog).toBeVisible();

    await editDialog.getByPlaceholder("Title").fill(editedTitle);
    await editDialog.getByPlaceholder(/Body/i).fill(editedBody);
    await editDialog.getByRole("button", { name: /^Save$/ }).last().click();

    const updatedViewDialog = page.getByRole("dialog", { name: editedTitle });
    await expect(updatedViewDialog).toBeVisible();
    await expect(updatedViewDialog.getByText(editedBody)).toBeVisible();
  });

  await test.step("delete with confirmation", async () => {
    const viewDialog = page.getByRole("dialog", { name: editedTitle });
    await expect(viewDialog).toBeVisible();

    await viewDialog.getByRole("button", { name: /^Delete$/ }).click();

    const confirmDialog = page.getByRole("dialog", { name: "Delete note?" });
    await expect(confirmDialog).toBeVisible();
    await confirmDialog.getByRole("button", { name: /^Delete$/ }).click();

    await expect(confirmDialog).toBeHidden();
    await expect(viewDialog).toBeHidden();
    await expect(noteOpenButton(page, editedTitle)).toHaveCount(0);
  });

  await test.step("reorder within section and persist in localStorage", async () => {
    await expect(noteOpenButton(page, noteTwo)).toBeVisible();
    await expect(noteOpenButton(page, noteThree)).toBeVisible();

    const before = await otherSectionTitles(page);
    expect(before).toEqual(expect.arrayContaining([noteTwo, noteThree]));
    expect(before.length).toBeGreaterThanOrEqual(2);

    const [first, second] = before;
    const expected = [second, first, ...before.slice(2)];

    await reorderHandleFor(page, first).dragTo(noteCard(page, second));

    await expect
      .poll(() => otherSectionTitles(page), {
        timeout: 10_000,
      })
      .toEqual(expected);

    await page.reload({ waitUntil: "domcontentloaded" });
    await ensureNotesUnlocked(page, passphrase);

    await expect(noteOpenButton(page, noteTwo)).toBeVisible();
    await expect(noteOpenButton(page, noteThree)).toBeVisible();

    await expect
      .poll(() => otherSectionTitles(page), {
        timeout: 10_000,
      })
      .toEqual(expected);
  });
});
