"use client";

import {
  Bold,
  Code,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Save,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/roiui/button";
import { Toolbar, ToolbarGroup } from "@/components/roiui/toolbar";
import { Tooltip } from "@/components/ui/tooltip";
import {
  buildNotesEditorShortcutFromKeyEvent,
  DEFAULT_NOTES_EDITOR_SHORTCUTS,
  formatNotesEditorShortcutForUi,
  NOTES_EDITOR_SHORTCUTS_STORAGE_KEY,
  type NotesEditorShortcutMap,
  readNotesEditorShortcutMapFromLocalStorage,
} from "@/lib/notes-editor-shortcuts";
import {
  toggleBulletList,
  toggleInlineMarker,
  toggleLinePrefix,
  toggleNumberedList,
} from "@/lib/notes-markdown-formatting";

function isMac() {
  if (typeof navigator === "undefined") return false;
  return navigator.platform.toLowerCase().includes("mac");
}

function schedule(fn: () => void) {
  setTimeout(fn, 0);
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function NoteBodyEditor({
  value,
  onChange,
  onSave,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  onSave?: () => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const [selection, setSelection] = useState<{ start: number; end: number }>({
    start: 0,
    end: 0,
  });
  const [shortcuts, setShortcuts] = useState<NotesEditorShortcutMap>(() => ({
    ...DEFAULT_NOTES_EDITOR_SHORTCUTS,
  }));

  const boldShortcutLabel = formatNotesEditorShortcutForUi(shortcuts.bold);
  const italicShortcutLabel = formatNotesEditorShortcutForUi(shortcuts.italic);
  const linkShortcutLabel = formatNotesEditorShortcutForUi(shortcuts.link);
  const saveShortcutLabel = formatNotesEditorShortcutForUi(shortcuts.save);
  const tipLabel = `Tip: Tab indents • ${boldShortcutLabel}/${italicShortcutLabel}/${linkShortcutLabel}${
    onSave ? ` • ${saveShortcutLabel}` : ""
  }`;

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

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  });

  function syncSelectionFromDom() {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? start;
    setSelection((prev) =>
      prev.start === start && prev.end === end ? prev : { start, end },
    );
  }
  function applyEdit(
    fn: (
      text: string,
      start: number,
      end: number,
    ) => {
      next: string;
      range: { start: number; end: number };
    },
  ) {
    const el = ref.current;
    if (!el) return;

    const startFromDom = el.selectionStart ?? 0;
    const endFromDom = el.selectionEnd ?? startFromDom;

    const domHasSelection = startFromDom !== endFromDom;
    const start = domHasSelection ? startFromDom : selection.start;
    const end = domHasSelection ? endFromDom : selection.end;

    const result = fn(value, start, end);
    onChange(result.next);

    schedule(() => {
      const node = ref.current;
      if (!node) return;
      const s = clamp(result.range.start, 0, node.value.length);
      const e = clamp(result.range.end, 0, node.value.length);
      node.focus();
      node.setSelectionRange(s, e);
      setSelection((prev) =>
        prev.start === s && prev.end === e ? prev : { start: s, end: e },
      );
    });
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (disabled) return;

    const mac = isMac();
    const metaOrCtrl = mac ? event.metaKey : event.ctrlKey;

    if (event.key === "Tab") {
      event.preventDefault();
      applyEdit((text, start, end) => {
        if (start === end) {
          const next = `${text.slice(0, start)}  ${text.slice(end)}`;
          return { next, range: { start: start + 2, end: start + 2 } };
        }

        const { next, range } = toggleLinePrefix(text, start, end, "  ");
        return { next, range };
      });
      return;
    }

    if (!metaOrCtrl) return;

    const built = buildNotesEditorShortcutFromKeyEvent(
      {
        key: event.key,
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
      },
      mac,
    );
    if (!built.ok) return;

    const shortcut = built.shortcut;

    if (shortcut === shortcuts.save && onSave) {
      event.preventDefault();
      onSave();
      return;
    }

    if (shortcut === shortcuts.bold) {
      event.preventDefault();
      applyEdit((text, start, end) =>
        toggleInlineMarker(text, start, end, "**"),
      );
      return;
    }

    if (shortcut === shortcuts.italic) {
      event.preventDefault();
      applyEdit((text, start, end) =>
        toggleInlineMarker(text, start, end, "*"),
      );
      return;
    }

    if (shortcut === shortcuts.link) {
      event.preventDefault();
      applyEdit((text, start, end) => {
        const selected = text.slice(start, end) || "link";
        const open = "[";
        const mid = "](";
        const close = ")";
        const next = `${text.slice(0, start)}${open}${selected}${mid}https://example.com${close}${text.slice(end)}`;

        const urlStart = start + open.length + selected.length + mid.length;
        const urlEnd = urlStart + "https://example.com".length;
        return { next, range: { start: urlStart, end: urlEnd } };
      });
    }
  }

  return (
    <div className="space-y-2">
      <Toolbar aria-label="Note editor toolbar" className="justify-start">
        <ToolbarGroup className="w-full max-w-max flex-wrap gap-1 rounded-2xl border border-border/70 bg-card/60 p-1">
          <Tooltip content={`Bold (${boldShortcutLabel})`}>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              aria-label="Bold"
              className="h-8 w-8 p-0"
              onClick={() => {
                applyEdit((text, start, end) =>
                  toggleInlineMarker(text, start, end, "**"),
                );
              }}
            >
              <Bold className="h-4 w-4" aria-hidden="true" />
            </Button>
          </Tooltip>
          <Tooltip content={`Italic (${italicShortcutLabel})`}>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              aria-label="Italic"
              className="h-8 w-8 p-0"
              onClick={() => {
                applyEdit((text, start, end) =>
                  toggleInlineMarker(text, start, end, "*"),
                );
              }}
            >
              <Italic className="h-4 w-4" aria-hidden="true" />
            </Button>
          </Tooltip>
          <Tooltip content="Inline code">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              aria-label="Inline code"
              className="h-8 w-8 p-0"
              onClick={() => {
                applyEdit((text, start, end) =>
                  toggleInlineMarker(text, start, end, "`"),
                );
              }}
            >
              <Code className="h-4 w-4" aria-hidden="true" />
            </Button>
          </Tooltip>
          <Tooltip content={`Link (${linkShortcutLabel})`}>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              aria-label="Link"
              className="h-8 w-8 p-0"
              onClick={() =>
                applyEdit((text, start, end) => {
                  const selected = text.slice(start, end) || "link";
                  const open = "[";
                  const mid = "](";
                  const close = ")";
                  const next = `${text.slice(0, start)}${open}${selected}${mid}https://example.com${close}${text.slice(end)}`;

                  const urlStart =
                    start + open.length + selected.length + mid.length;
                  const urlEnd = urlStart + "https://example.com".length;
                  return { next, range: { start: urlStart, end: urlEnd } };
                })
              }
            >
              <Link2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </Tooltip>
          <Tooltip content="Quote">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              aria-label="Quote"
              className="h-8 w-8 p-0"
              onClick={() => {
                applyEdit((text, start, end) =>
                  toggleLinePrefix(text, start, end, "> "),
                );
              }}
            >
              <Quote className="h-4 w-4" aria-hidden="true" />
            </Button>
          </Tooltip>
          <Tooltip content="Bullet list">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              aria-label="Bullet list"
              className="h-8 w-8 p-0"
              onClick={() => {
                applyEdit((text, start, end) =>
                  toggleBulletList(text, start, end),
                );
              }}
            >
              <List className="h-4 w-4" aria-hidden="true" />
            </Button>
          </Tooltip>
          <Tooltip content="Numbered list">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              aria-label="Numbered list"
              className="h-8 w-8 p-0"
              onClick={() => {
                applyEdit((text, start, end) =>
                  toggleNumberedList(text, start, end),
                );
              }}
            >
              <ListOrdered className="h-4 w-4" aria-hidden="true" />
            </Button>
          </Tooltip>

          {onSave ? (
            <span className="mx-1 h-5 w-px bg-border/70" aria-hidden="true" />
          ) : null}

          {onSave ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              title={`Save (${saveShortcutLabel})`}
              onClick={onSave}
              className="h-8 rounded-xl px-2.5 text-xs"
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              Save
            </Button>
          ) : null}
        </ToolbarGroup>
      </Toolbar>

      <p className="text-xs text-muted-foreground">{tipLabel}</p>

      <fieldset aria-label="Note editor" className="space-y-1 border-0 p-0">
        <textarea
          ref={ref}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          onSelect={syncSelectionFromDom}
          onKeyUp={syncSelectionFromDom}
          onMouseUp={syncSelectionFromDom}
          onFocus={syncSelectionFromDom}
          placeholder={placeholder}
          disabled={disabled}
          className="min-h-[120px] w-full resize-none rounded-md border border-input bg-background px-3 py-2 font-mono text-sm leading-6 shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </fieldset>
    </div>
  );
}
