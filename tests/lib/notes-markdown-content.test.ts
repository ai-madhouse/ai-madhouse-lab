import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { NoteMarkdownContent } from "@/components/notes/note-markdown-content";

const markdownBody = [
  "**bold** [link](https://example.com)",
  "- item",
  "> quote",
  "`code`",
].join("\n");

describe("note markdown content", () => {
  test("renders markdown as semantic html", () => {
    const html = renderToStaticMarkup(
      createElement(NoteMarkdownContent, { body: markdownBody }),
    );

    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain('<a href="https://example.com"');
    expect(html).toContain("<ul");
    expect(html).toContain("<blockquote");
    expect(html).toContain("<code");
  });

  test("supports preview block limits while preserving markdown rendering", () => {
    const html = renderToStaticMarkup(
      createElement(NoteMarkdownContent, {
        body: markdownBody,
        maxBlocks: 2,
      }),
    );

    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<ul");
    expect(html).toContain("…");
    expect(html).not.toContain("<blockquote");
    expect(html).not.toContain("**bold**");
  });
});
