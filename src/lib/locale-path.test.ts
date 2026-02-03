import { describe, expect, test } from "bun:test";
import { switchLocalePathname } from "@/lib/locale-path";

describe("switchLocalePathname", () => {
  test("replaces existing locale segment", () => {
    expect(
      switchLocalePathname({ pathname: "/en/dashboard", nextLocale: "ru" }),
    ).toBe("/ru/dashboard");
  });

  test("prefixes when path has no locale segment", () => {
    expect(
      switchLocalePathname({ pathname: "/dashboard", nextLocale: "lt" }),
    ).toBe("/lt/dashboard");
  });

  test("handles locale root", () => {
    expect(switchLocalePathname({ pathname: "/en", nextLocale: "ru" })).toBe(
      "/ru",
    );
    expect(switchLocalePathname({ pathname: "/en/", nextLocale: "ru" })).toBe(
      "/ru/",
    );
  });

  test("handles site root", () => {
    expect(switchLocalePathname({ pathname: "/", nextLocale: "ru" })).toBe(
      "/ru",
    );
  });

  test("treats unknown first segment as non-locale", () => {
    expect(
      switchLocalePathname({ pathname: "/apiary", nextLocale: "en" }),
    ).toBe("/en/apiary");
  });
});
