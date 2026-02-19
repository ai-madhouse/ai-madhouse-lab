import { expect, type Page, test } from "@playwright/test";

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

function titlesEqual(a: string[], b: string[]) {
  return JSON.stringify(a) === JSON.stringify(b);
}

async function dragByMouse(
  page: Page,
  fromTitle: string,
  toTitle: string,
): Promise<boolean> {
  const fromSurface = noteOpenButton(page, fromTitle);
  const toCard = noteCard(page, toTitle);

  const fromBox = await fromSurface.boundingBox();
  const toBox = await toCard.boundingBox();

  if (!fromBox || !toBox) return false;

  await page.mouse.move(
    fromBox.x + fromBox.width / 2,
    fromBox.y + fromBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(toBox.x + toBox.width / 2, toBox.y + toBox.height / 2, {
    steps: 10,
  });
  await page.mouse.up();
  return true;
}

async function createNote(page: Page, title: string, body: string) {
  const titleInput = page.getByRole("textbox", { name: "Title" });
  const bodyInput = page.getByRole("textbox", { name: "Body (Markdown)" });
  const createBtn = page.getByRole("button", { name: /^Create$/ }).first();

  await titleInput.fill(title);
  await bodyInput.fill(body);
  await expect(createBtn).toBeEnabled();
  await createBtn.click();

  await expect(noteOpenButton(page, title)).toBeVisible();
}

async function otherSectionTitles(page: Page) {
  const section = page.locator(
    'section[aria-labelledby="notes-other-heading"]',
  );
  await expect(section).toBeVisible();

  const titles = await section
    .getByRole("button", { name: /^Open note:/ })
    .evaluateAll((nodes) =>
      nodes
        .map((node) => node.getAttribute("aria-label") || "")
        .map((label) => label.replace(/^Open note:\s*/, ""))
        .filter(Boolean),
    );

  return titles;
}

test("notes: CRUD smoke (create/edit/delete)", async ({ page }) => {
  const { locale } = await registerAndLandOnDashboard(page, { locale: "en" });
  const passphrase = "CorrectHorseBatteryStaple1!";

  const seed = Date.now().toString(36);
  const title = `pw smoke ${seed}`;
  const editedTitle = `${title} edited`;
  const body = "smoke body";
  const editedBody = "smoke body edited";

  await gotoNotes(page, locale);
  await ensureNotesUnlocked(page, passphrase);
  await createNote(page, title, body);

  await noteOpenButton(page, title).click();
  const viewDialog = page.getByRole("dialog", { name: title });
  await expect(viewDialog).toBeVisible();

  await viewDialog.getByRole("button", { name: /^Edit$/ }).click();
  const editDialog = page.getByRole("dialog", { name: "Edit note" });
  await expect(editDialog).toBeVisible();

  await editDialog.getByPlaceholder("Title").fill(editedTitle);
  await editDialog.getByPlaceholder(/Body/i).fill(editedBody);
  await editDialog
    .getByRole("button", { name: /^Save$/ })
    .last()
    .click();

  const updatedViewDialog = page.getByRole("dialog", { name: editedTitle });
  await expect(updatedViewDialog).toBeVisible();
  await expect(updatedViewDialog.getByText(editedBody)).toBeVisible();

  await updatedViewDialog.getByRole("button", { name: /^Delete$/ }).click();
  const confirmDialog = page.getByRole("dialog", { name: "Delete note?" });
  await expect(confirmDialog).toBeVisible();
  await confirmDialog.getByRole("button", { name: /^Delete$/ }).click();

  await expect(updatedViewDialog).toBeHidden();
  await expect(noteOpenButton(page, editedTitle)).toHaveCount(0);
});

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
    const pinnedCard = pinnedSection
      .getByRole("button", {
        name: `Open note: ${noteToMutate}`,
      })
      .locator("..");
    const pinnedMarker = pinnedCard.getByRole("img", { name: "Pinned note" });
    const pinnedMarkerBox = await pinnedMarker.boundingBox();

    expect(pinnedMarkerBox).not.toBeNull();
    if (!pinnedMarkerBox) {
      throw new Error("Expected pinned marker bounds");
    }
    await expect(
      pinnedCard.getByRole("button", { name: "Reorder note" }),
    ).toHaveCount(0);

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
    await expect(page.getByRole("dialog")).toHaveCount(1);

    const closeButton = editDialog.getByRole("button", { name: "Close" });
    await closeButton.hover();
    await expect(page.getByRole("tooltip", { name: "Close" })).toHaveCount(0);
    await expect(closeButton).not.toHaveAttribute("aria-describedby", /.+/);

    await editDialog.getByPlaceholder("Title").fill(editedTitle);
    await editDialog.getByPlaceholder(/Body/i).fill(editedBody);
    await editDialog
      .getByRole("button", { name: /^Save$/ })
      .last()
      .click();

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
    const expected = [...before];
    const firstIndex = expected.indexOf(first);
    const secondIndex = expected.indexOf(second);
    if (firstIndex === -1 || secondIndex === -1) {
      throw new Error("Expected both reorder candidates to exist");
    }
    [expected[firstIndex], expected[secondIndex]] = [
      expected[secondIndex],
      expected[firstIndex],
    ];

    let reordered = false;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const from = attempt % 2 === 0 ? first : second;
      const to = attempt % 2 === 0 ? second : first;

      await noteOpenButton(page, from).dragTo(noteCard(page, to));

      let afterAttempt = await otherSectionTitles(page);
      if (titlesEqual(afterAttempt, expected)) {
        reordered = true;
        break;
      }

      const usedMouseFallback = await dragByMouse(page, from, to);
      if (!usedMouseFallback) {
        continue;
      }

      afterAttempt = await otherSectionTitles(page);
      if (titlesEqual(afterAttempt, expected)) {
        reordered = true;
        break;
      }
    }
    expect(reordered).toBe(true);

    await expect
      .poll(() => otherSectionTitles(page), {
        timeout: 10_000,
      })
      .toEqual(expect.arrayContaining([noteTwo, noteThree]));

    const after = await otherSectionTitles(page);

    await page.reload({ waitUntil: "domcontentloaded" });
    await ensureNotesUnlocked(page, passphrase);

    await expect(noteOpenButton(page, noteTwo)).toBeVisible();
    await expect(noteOpenButton(page, noteThree)).toBeVisible();

    const reloaded = await otherSectionTitles(page);
    expect(reloaded).toEqual(after);
  });
});

test("notes: E2EE setup + wrong passphrase recovery + reload unlock", async ({
  page,
}) => {
  const { locale, username, password } = await registerAndLandOnDashboard(
    page,
    {
      locale: "en",
    },
  );
  const passphrase = "CorrectHorseBatteryStaple1!";
  const wrongPassphrase = "WrongBatteryHorseStaple1!";
  const seed = Date.now().toString(36);
  const title = `pw e2ee ${seed}`;

  await test.step("first-time setup and unlock", async () => {
    await gotoNotes(page, locale);
    const setupInput = page.getByPlaceholder(/Set an E2EE passphrase/i);
    await expect(setupInput).toBeVisible();
    await setupInput.fill(passphrase);
    await page.getByPlaceholder(/Confirm passphrase/i).fill(passphrase);
    await page.getByRole("button", { name: "Create & unlock" }).click();
    await expect(page.getByRole("textbox", { name: "Title" })).toBeEnabled();
  });

  await test.step("create encrypted note", async () => {
    await createNote(page, title, "persist me");
  });

  await test.step("relock by signing out/in, then fail + recover unlock", async () => {
    await page
      .locator("header")
      .getByRole("button", { name: /Sign out/i })
      .click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/login`));

    await page.goto(
      `/${locale}/login?next=${encodeURIComponent(`/${locale}/notes`)}`,
      {
        waitUntil: "domcontentloaded",
      },
    );
    await page.getByLabel("Username").fill(username);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/notes`));

    const titleInput = page.getByRole("textbox", { name: "Title" });
    const unlockInput = page.getByPlaceholder(/Enter your E2EE passphrase/i);
    await expect(unlockInput).toBeVisible();
    await expect(titleInput).toBeDisabled();

    await unlockInput.fill(wrongPassphrase);
    await page.getByRole("button", { name: /^Unlock$/i }).click();
    await expect(page.getByRole("button", { name: /^Unlock$/i })).toBeEnabled();
    await expect(titleInput).toBeDisabled();

    await unlockInput.fill(passphrase);
    await page.getByRole("button", { name: /^Unlock$/i }).click();
    await expect(titleInput).toBeEnabled();
    await expect(noteOpenButton(page, title)).toBeVisible();
  });

  await test.step("reload requires unlock and preserves note after re-unlock", async () => {
    await page.reload({ waitUntil: "domcontentloaded" });
    const unlockInput = page.getByPlaceholder(/Enter your E2EE passphrase/i);
    const titleInput = page.getByRole("textbox", { name: "Title" });
    await expect(unlockInput).toBeVisible();
    await expect(titleInput).toBeDisabled();

    await unlockInput.fill(passphrase);
    await page.getByRole("button", { name: /^Unlock$/i }).click();
    await expect(titleInput).toBeEnabled();
    await expect(noteOpenButton(page, title)).toBeVisible();
  });
});
