import { describe, expect, test } from "bun:test";
import { createTranslator } from "@/lib/translator";

describe("createTranslator", () => {
  test("resolves nested keys and interpolates values", () => {
    const messages = {
      section: {
        title: "Hello {name}",
      },
    };

    const t = createTranslator(messages, "section");

    expect(t("title", { name: "Ada" })).toBe("Hello Ada");
  });
});
