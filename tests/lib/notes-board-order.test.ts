import { describe, expect, test } from "bun:test";

import {
  arrayMove,
  mergeNoteOrderIds,
  toUniqueStringArray,
} from "@/lib/notes-board-order";

describe("notes board ordering", () => {
  test("toUniqueStringArray filters to unique strings", () => {
    expect(toUniqueStringArray(["a", "b", "a", 1, null])).toEqual(["a", "b"]);
    expect(toUniqueStringArray("nope")).toEqual([]);
  });

  test("mergeNoteOrderIds prepends missing ids and keeps saved order", () => {
    const current = ["n3", "n2", "n1"];
    const saved = ["n1", "n3", "missing", "n3"];

    expect(mergeNoteOrderIds(saved, current)).toEqual(["n2", "n1", "n3"]);
  });

  test("arrayMove returns a new array", () => {
    const original = ["a", "b", "c"];
    const moved = arrayMove(original, 0, 2);

    expect(moved).toEqual(["b", "c", "a"]);
    expect(original).toEqual(["a", "b", "c"]);
  });
});
