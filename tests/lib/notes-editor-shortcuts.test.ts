import { describe, expect, test } from "bun:test";

import {
  buildNotesEditorShortcutFromKeyEvent,
  DEFAULT_NOTES_EDITOR_SHORTCUTS,
  isDuplicateNotesEditorShortcut,
  isReservedNotesEditorShortcut,
  normalizeNotesEditorShortcutMap,
  normalizeNotesEditorShortcutString,
} from "@/lib/notes-editor-shortcuts";

describe("notes editor shortcuts", () => {
  test("normalizes shortcut strings", () => {
    expect(normalizeNotesEditorShortcutString("Mod+b")).toBe("Mod+B");
    expect(normalizeNotesEditorShortcutString(" mod + shift + i ")).toBe(
      "Mod+Shift+I",
    );
    expect(normalizeNotesEditorShortcutString("")).toBeNull();
    expect(normalizeNotesEditorShortcutString("B")).toBeNull();
  });

  test("detects reserved shortcuts", () => {
    expect(isReservedNotesEditorShortcut("Mod+R")).toBeTrue();
    expect(isReservedNotesEditorShortcut("Mod+Shift+R")).toBeTrue();
    expect(isReservedNotesEditorShortcut("Mod+W")).toBeTrue();
    expect(isReservedNotesEditorShortcut("Mod+B")).toBeFalse();
  });

  test("flags duplicates", () => {
    const map = {
      ...DEFAULT_NOTES_EDITOR_SHORTCUTS,
      italic: "Mod+B",
    };

    expect(isDuplicateNotesEditorShortcut("italic", "Mod+B", map)).toBeTrue();
    expect(isDuplicateNotesEditorShortcut("bold", "Mod+B", map)).toBeTrue();
    expect(
      isDuplicateNotesEditorShortcut(
        "bold",
        DEFAULT_NOTES_EDITOR_SHORTCUTS.bold,
        DEFAULT_NOTES_EDITOR_SHORTCUTS,
      ),
    ).toBeFalse();
  });

  test("normalizes stored maps with fallbacks", () => {
    expect(
      normalizeNotesEditorShortcutMap({
        bold: "Mod+x",
        italic: "Mod+y",
        link: "Mod+z",
        save: "Mod+s",
      }),
    ).toEqual({
      save: "Mod+S",
      bold: "Mod+X",
      italic: "Mod+Y",
      link: "Mod+Z",
    });

    expect(
      normalizeNotesEditorShortcutMap({
        bold: "Mod+B",
        italic: "Mod+B",
      }),
    ).toEqual(DEFAULT_NOTES_EDITOR_SHORTCUTS);

    expect(
      normalizeNotesEditorShortcutMap({
        save: "Mod+R",
      }),
    ).toEqual(DEFAULT_NOTES_EDITOR_SHORTCUTS);
  });

  test("builds shortcuts from key events", () => {
    expect(
      buildNotesEditorShortcutFromKeyEvent(
        {
          key: "b",
          metaKey: false,
          ctrlKey: true,
          shiftKey: false,
          altKey: false,
        },
        false,
      ),
    ).toEqual({ ok: true, shortcut: "Mod+B" });

    expect(
      buildNotesEditorShortcutFromKeyEvent(
        {
          key: "r",
          metaKey: false,
          ctrlKey: true,
          shiftKey: false,
          altKey: false,
        },
        false,
      ),
    ).toEqual({ ok: false, error: "reserved" });

    expect(
      buildNotesEditorShortcutFromKeyEvent(
        {
          key: "b",
          metaKey: false,
          ctrlKey: false,
          shiftKey: false,
          altKey: false,
        },
        false,
      ),
    ).toEqual({ ok: false, error: "missing_mod" });

    expect(
      buildNotesEditorShortcutFromKeyEvent(
        {
          key: "Enter",
          metaKey: false,
          ctrlKey: true,
          shiftKey: false,
          altKey: false,
        },
        false,
      ),
    ).toEqual({ ok: false, error: "invalid" });
  });
});
