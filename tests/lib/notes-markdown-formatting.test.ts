import { describe, expect, test } from "bun:test";

import {
  toggleBulletList,
  toggleInlineMarker,
  toggleNumberedList,
} from "@/lib/notes-markdown-formatting";

describe("notes markdown formatting", () => {
  test("toggles bold markers without duplicating", () => {
    const wrapped = toggleInlineMarker("hello", 0, 5, "**");
    expect(wrapped).toEqual({
      next: "**hello**",
      range: { start: 2, end: 7 },
    });

    const unwrapped = toggleInlineMarker(
      wrapped.next,
      wrapped.range.start,
      wrapped.range.end,
      "**",
    );
    expect(unwrapped).toEqual({
      next: "hello",
      range: { start: 0, end: 5 },
    });
  });

  test("toggles collapsed inline markers", () => {
    const wrapped = toggleInlineMarker("abc", 1, 1, "*");
    expect(wrapped).toEqual({
      next: "a**bc",
      range: { start: 2, end: 2 },
    });

    const unwrapped = toggleInlineMarker(
      wrapped.next,
      wrapped.range.start,
      wrapped.range.end,
      "*",
    );
    expect(unwrapped).toEqual({
      next: "abc",
      range: { start: 1, end: 1 },
    });
  });

  test("applies numbered lists with auto-increment for multiline selections", () => {
    const text = "alpha\nbeta\ngamma";
    const result = toggleNumberedList(text, 0, text.length);
    expect(result).toEqual({
      next: "1. alpha\n2. beta\n3. gamma",
      range: { start: 0, end: 25 },
    });
  });

  test("removes numbered markers when all selected lines are numbered", () => {
    const text = "1. alpha\n2. beta\n3. gamma";
    const result = toggleNumberedList(text, 0, text.length);
    expect(result).toEqual({
      next: "alpha\nbeta\ngamma",
      range: { start: 0, end: 16 },
    });
  });

  test("numbered list conversion replaces existing bullet markers", () => {
    const text = "- alpha\n- beta";
    const result = toggleNumberedList(text, 0, text.length);
    expect(result).toEqual({
      next: "1. alpha\n2. beta",
      range: { start: 0, end: 16 },
    });
  });

  test("bullet list conversion replaces existing numbered markers", () => {
    const text = "1. alpha\n2. beta";
    const result = toggleBulletList(text, 0, text.length);
    expect(result).toEqual({
      next: "- alpha\n- beta",
      range: { start: 0, end: 14 },
    });
  });
});
