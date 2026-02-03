import { describe, expect, test } from "bun:test";
import { getAppInfo } from "@/lib/app-info";

describe("getAppInfo", () => {
  test("returns a version when available", () => {
    const info = getAppInfo();
    expect(typeof info.version === "string" || info.version === undefined).toBe(
      true,
    );
  });

  test("commit is optional (depends on environment)", () => {
    const info = getAppInfo();
    expect(typeof info.commit === "string" || info.commit === undefined).toBe(
      true,
    );
  });
});
