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
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";

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

function getLineStart(text: string, index: number) {
  return text.lastIndexOf("\n", index - 1) + 1;
}

function getLineEnd(text: string, index: number) {
  const next = text.indexOf("\n", index);
  return next === -1 ? text.length : next;
}

function prefixLines(text: string, start: number, end: number, prefix: string) {
  const a = getLineStart(text, start);
  const b = getLineEnd(text, end);

  const before = text.slice(0, a);
  const middle = text.slice(a, b);
  const after = text.slice(b);

  const updated = middle
    .split("\n")
    .map((line) =>
      line.startsWith(prefix) ? line.slice(prefix.length) : `${prefix}${line}`,
    )
    .join("\n");

  return {
    next: `${before}${updated}${after}`,
    range: { start: a, end: a + updated.length },
  };
}

function wrap(
  text: string,
  start: number,
  end: number,
  open: string,
  close = open,
) {
  const selected = text.slice(start, end);
  const next = `${text.slice(0, start)}${open}${selected}${close}${text.slice(end)}`;
  return {
    next,
    range: { start: start + open.length, end: end + open.length },
  };
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

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  });

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

    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? start;

    const result = fn(value, start, end);
    onChange(result.next);

    schedule(() => {
      const node = ref.current;
      if (!node) return;
      const s = clamp(result.range.start, 0, node.value.length);
      const e = clamp(result.range.end, 0, node.value.length);
      node.focus();
      node.setSelectionRange(s, e);
    });
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (disabled) return;

    const metaOrCtrl = isMac() ? event.metaKey : event.ctrlKey;

    if (event.key === "Tab") {
      event.preventDefault();
      applyEdit((text, start, end) => {
        if (start === end) {
          const next = `${text.slice(0, start)}  ${text.slice(end)}`;
          return { next, range: { start: start + 2, end: start + 2 } };
        }

        const { next, range } = prefixLines(text, start, end, "  ");
        return { next, range };
      });
      return;
    }

    if (!metaOrCtrl) return;

    const key = event.key.toLowerCase();

    if (key === "s" && onSave) {
      event.preventDefault();
      onSave();
      return;
    }

    if (key === "b") {
      event.preventDefault();
      applyEdit((text, start, end) => wrap(text, start, end, "**"));
      return;
    }

    if (key === "i") {
      event.preventDefault();
      applyEdit((text, start, end) => wrap(text, start, end, "*"));
      return;
    }

    if (key === "k") {
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
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          title="Bold (Ctrl/Cmd+B)"
          onClick={() =>
            applyEdit((text, start, end) => wrap(text, start, end, "**"))
          }
        >
          <Bold className="h-4 w-4" aria-label="Bold" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          title="Italic (Ctrl/Cmd+I)"
          onClick={() =>
            applyEdit((text, start, end) => wrap(text, start, end, "*"))
          }
        >
          <Italic className="h-4 w-4" aria-label="Italic" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          title="Inline code"
          onClick={() =>
            applyEdit((text, start, end) => wrap(text, start, end, "`"))
          }
        >
          <Code className="h-4 w-4" aria-label="Code" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          title="Link (Ctrl/Cmd+K)"
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
          <Link2 className="h-4 w-4" aria-label="Link" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          title="Quote"
          onClick={() =>
            applyEdit((text, start, end) => prefixLines(text, start, end, "> "))
          }
        >
          <Quote className="h-4 w-4" aria-label="Quote" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          title="Bullet list"
          onClick={() =>
            applyEdit((text, start, end) => prefixLines(text, start, end, "- "))
          }
        >
          <List className="h-4 w-4" aria-label="Bullets" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          title="Numbered list"
          onClick={() =>
            applyEdit((text, start, end) =>
              prefixLines(text, start, end, "1. "),
            )
          }
        >
          <ListOrdered className="h-4 w-4" aria-label="Numbered" />
        </Button>

        {onSave ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            title="Save (Ctrl/Cmd+S)"
            onClick={onSave}
            className="gap-2"
          >
            <Save className="h-4 w-4" aria-label="Save" />
            Save
          </Button>
        ) : null}

        <p className="text-xs text-muted-foreground">
          Tip: Tab indents • Ctrl/Cmd+B/I/K • Ctrl/Cmd+S
        </p>
      </div>

      <textarea
        ref={ref}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="min-h-[120px] w-full resize-none rounded-md border border-input bg-background px-3 py-2 font-mono text-sm leading-6 shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
    </div>
  );
}
