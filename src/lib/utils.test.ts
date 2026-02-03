import { describe, expect, test } from "bun:test";
import { cn } from "@/lib/utils";

describe("cn", () => {
  test("joins truthy classes", () => {
    expect(cn("alpha", false, "bravo", undefined, "charlie")).toBe(
      "alpha bravo charlie",
    );
  });

  test("returns empty string when no classes", () => {
    expect(cn(false, undefined, null)).toBe("");
  });
});
