import { describe, expect, test } from "bun:test";

import { parseNotesMarkdown } from "@/lib/notes-markdown-render";

describe("notes markdown render parsing", () => {
  test("parses inline formatting in paragraph", () => {
    const blocks = parseNotesMarkdown(
      "hello **bold** *italic* `code` [site](https://example.com)",
    );

    expect(blocks).toEqual([
      {
        type: "paragraph",
        inlines: [
          { type: "text", text: "hello " },
          { type: "strong", text: "bold" },
          { type: "text", text: " " },
          { type: "emphasis", text: "italic" },
          { type: "text", text: " " },
          { type: "code", text: "code" },
          { type: "text", text: " " },
          { type: "link", text: "site", href: "https://example.com" },
        ],
      },
    ]);
  });

  test("parses headings, quote, and lists", () => {
    const blocks = parseNotesMarkdown(
      "# Header\n> quoted\n- one\n- two\n1. first\n2. second",
    );

    expect(blocks).toEqual([
      {
        type: "heading",
        level: 1,
        inlines: [{ type: "text", text: "Header" }],
      },
      {
        type: "blockquote",
        lines: [[{ type: "text", text: "quoted" }]],
      },
      {
        type: "unordered-list",
        items: [
          [{ type: "text", text: "one" }],
          [{ type: "text", text: "two" }],
        ],
      },
      {
        type: "ordered-list",
        items: [
          [{ type: "text", text: "first" }],
          [{ type: "text", text: "second" }],
        ],
      },
    ]);
  });

  test("parses fenced code blocks", () => {
    const blocks = parseNotesMarkdown("```ts\nconst x = 1;\n```");

    expect(blocks).toEqual([{ type: "code-block", code: "const x = 1;" }]);
  });
});
