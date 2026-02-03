import { describe, expect, test } from "bun:test";
import { type NotesAction, popLast, pushUndo } from "@/lib/notes-history";

describe("notes history", () => {
  test("pushUndo caps length", () => {
    const base: NotesAction[] = Array.from({ length: 3 }, (_, i) => ({
      kind: "create",
      note: {
        id: String(i),
        title: "t",
        body: "",
        created_at: "",
      },
    }));

    const next = pushUndo(base, base[0], 3);
    expect(next.length).toBe(3);
  });

  test("popLast returns item and rest", () => {
    const { item, rest } = popLast([1, 2, 3]);
    expect(item).toBe(3);
    expect(rest).toEqual([1, 2]);
  });
});
