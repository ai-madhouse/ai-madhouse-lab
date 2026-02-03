import { describe, expect, test } from "bun:test";
import { authenticate } from "@/lib/auth";

describe("authenticate", () => {
  test("accepts matching credentials", () => {
    process.env.DEMO_USER = "operator";
    process.env.DEMO_PASS = "madhouse";
    expect(authenticate("operator", "madhouse")).toBe(true);
  });

  test("rejects mismatched credentials", () => {
    process.env.DEMO_USER = "operator";
    process.env.DEMO_PASS = "madhouse";
    expect(authenticate("operator", "wrong")).toBe(false);
  });
});
