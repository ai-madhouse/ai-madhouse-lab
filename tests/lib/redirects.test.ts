import { describe, expect, test } from "bun:test";
import { safeNextPath } from "@/lib/redirects";

describe("safeNextPath", () => {
  test("defaults to locale dashboard when next is empty", () => {
    expect(safeNextPath("en", "")).toBe("/en/dashboard");
  });

  test("rejects absolute URLs", () => {
    expect(safeNextPath("en", "https://example.com/phish")).toBe(
      "/en/dashboard",
    );
    expect(safeNextPath("en", "//example.com/phish")).toBe("/en/dashboard");
  });

  test("rejects non-path values", () => {
    expect(safeNextPath("en", "dashboard")).toBe("/en/dashboard");
  });

  test("rejects locale escape", () => {
    expect(safeNextPath("en", "/ru/dashboard")).toBe("/en/dashboard");
  });

  test("allows within-locale paths", () => {
    expect(safeNextPath("en", "/en/settings?tab=security")).toBe(
      "/en/settings?tab=security",
    );
    expect(safeNextPath("lt", "/lt")).toBe("/lt");
  });
});
