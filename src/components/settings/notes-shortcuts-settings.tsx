"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  buildNotesEditorShortcutFromKeyEvent,
  DEFAULT_NOTES_EDITOR_SHORTCUTS,
  formatNotesEditorShortcutForUi,
  isDuplicateNotesEditorShortcut,
  NOTES_EDITOR_ACTIONS,
  NOTES_EDITOR_SHORTCUTS_STORAGE_KEY,
  type NotesEditorAction,
  type NotesEditorShortcutError,
  type NotesEditorShortcutMap,
  readNotesEditorShortcutMapFromLocalStorage,
  writeNotesEditorShortcutMapToLocalStorage,
} from "@/lib/notes-editor-shortcuts";

function isMacPlatform() {
  if (typeof navigator === "undefined") return false;
  return navigator.platform.toLowerCase().includes("mac");
}

function isActionWithShortcut(value: string): value is NotesEditorAction {
  return (NOTES_EDITOR_ACTIONS as readonly string[]).includes(value);
}

export function NotesShortcutsSettings() {
  const t = useTranslations("Settings.shortcuts");
  const id = useId();

  const [shortcuts, setShortcuts] = useState<NotesEditorShortcutMap>(() => ({
    ...DEFAULT_NOTES_EDITOR_SHORTCUTS,
  }));

  const [errors, setErrors] = useState<
    Partial<Record<NotesEditorAction, NotesEditorShortcutError>>
  >({});

  useEffect(() => {
    const stored = readNotesEditorShortcutMapFromLocalStorage();
    if (stored.ok) setShortcuts(stored.shortcuts);
  }, []);

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== NOTES_EDITOR_SHORTCUTS_STORAGE_KEY) return;
      const stored = readNotesEditorShortcutMapFromLocalStorage();
      if (stored.ok) setShortcuts(stored.shortcuts);
    }

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function reset() {
    const next = { ...DEFAULT_NOTES_EDITOR_SHORTCUTS };
    setErrors({});
    setShortcuts(next);
    writeNotesEditorShortcutMapToLocalStorage(next);
  }

  function setActionShortcut(action: NotesEditorAction, nextShortcut: string) {
    const next = { ...shortcuts, [action]: nextShortcut };
    setErrors((prev) => {
      if (!prev[action]) return prev;
      const copy = { ...prev };
      delete copy[action];
      return copy;
    });
    setShortcuts(next);
    writeNotesEditorShortcutMapToLocalStorage(next);
  }

  function onCaptureKeyDown(
    action: NotesEditorAction,
    event: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (event.key === "Tab") return;

    if (event.key === "Escape") {
      event.preventDefault();
      event.currentTarget.blur();
      return;
    }

    event.preventDefault();

    if (event.key === "Backspace" || event.key === "Delete") {
      setErrors((prev) => ({ ...prev, [action]: "empty" }));
      return;
    }

    const built = buildNotesEditorShortcutFromKeyEvent(
      {
        key: event.key,
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
      },
      isMacPlatform(),
    );

    if (!built.ok) {
      setErrors((prev) => ({ ...prev, [action]: built.error }));
      return;
    }

    if (isDuplicateNotesEditorShortcut(action, built.shortcut, shortcuts)) {
      setErrors((prev) => ({ ...prev, [action]: "duplicate" }));
      return;
    }

    setActionShortcut(action, built.shortcut);
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4">
        {NOTES_EDITOR_ACTIONS.map((action) => {
          if (!isActionWithShortcut(action)) return null;
          const inputId = `${id}-${action}`;
          const formatted = formatNotesEditorShortcutForUi(shortcuts[action]);
          const error = errors[action];

          return (
            <div
              key={action}
              className="grid gap-2 sm:grid-cols-[1fr,16rem] sm:items-start"
            >
              <div className="space-y-1">
                <Label htmlFor={inputId}>{t(`actions.${action}`)}</Label>
                <p className="text-xs text-muted-foreground">
                  {t(`actionHelp.${action}`)}
                </p>
              </div>
              <div className="space-y-1">
                <Input
                  id={inputId}
                  value={formatted}
                  readOnly
                  placeholder={t("placeholder")}
                  onKeyDown={(event) => onCaptureKeyDown(action, event)}
                  onFocus={(event) => {
                    event.currentTarget.select();
                  }}
                  aria-invalid={error ? true : undefined}
                />
                {error ? (
                  <p className="text-xs text-destructive">
                    {t(`errors.${error}`)}
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="outline" onClick={reset}>
          {t("reset")}
        </Button>
      </div>
    </div>
  );
}
