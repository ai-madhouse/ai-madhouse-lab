import { describe, expect, test } from "bun:test";

import { hashPassword, verifyPassword } from "@/lib/passwords";

describe("passwords", () => {
  test("hashPassword + verifyPassword roundtrip", () => {
    const stored = hashPassword("correct horse battery staple");

    expect(
      verifyPassword({ password: "correct horse battery staple", stored }),
    ).toBe(true);

    expect(verifyPassword({ password: "wrong", stored })).toBe(false);
  });

  test("verifyPassword rejects malformed", () => {
    expect(verifyPassword({ password: "x", stored: "nope" })).toBe(false);
  });
});
