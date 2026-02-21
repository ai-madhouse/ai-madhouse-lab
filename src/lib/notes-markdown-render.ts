export type InlineNode =
  | { type: "text"; text: string }
  | { type: "strong"; text: string }
  | { type: "emphasis"; text: string }
  | { type: "code"; text: string }
  | { type: "link"; text: string; href: string };

export type BlockNode =
  | { type: "heading"; level: 1 | 2 | 3 | 4 | 5 | 6; inlines: InlineNode[] }
  | { type: "paragraph"; inlines: InlineNode[] }
  | { type: "unordered-list"; items: InlineNode[][] }
  | { type: "ordered-list"; items: InlineNode[][] }
  | { type: "blockquote"; lines: InlineNode[][] }
  | { type: "code-block"; code: string };

const INLINE_TOKEN_REGEX =
  /(\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)|`([^`\n]+)`|\*\*([^*\n]+)\*\*|\*([^*\n]+)\*)/g;

function parseInline(text: string): InlineNode[] {
  const trimmed = text.trim();
  if (!trimmed) return [{ type: "text", text: "" }];

  const nodes: InlineNode[] = [];
  let cursor = 0;

  for (const match of trimmed.matchAll(INLINE_TOKEN_REGEX)) {
    const full = match[1];
    if (typeof full !== "string") continue;

    const at = match.index ?? -1;
    if (at < cursor) continue;

    if (at > cursor) {
      nodes.push({ type: "text", text: trimmed.slice(cursor, at) });
    }

    const linkText = match[2];
    const linkHref = match[3];
    const codeText = match[4];
    const strongText = match[5];
    const emphasisText = match[6];

    if (typeof linkText === "string" && typeof linkHref === "string") {
      nodes.push({ type: "link", text: linkText, href: linkHref });
    } else if (typeof codeText === "string") {
      nodes.push({ type: "code", text: codeText });
    } else if (typeof strongText === "string") {
      nodes.push({ type: "strong", text: strongText });
    } else if (typeof emphasisText === "string") {
      nodes.push({ type: "emphasis", text: emphasisText });
    }

    cursor = at + full.length;
  }

  if (cursor < trimmed.length) {
    nodes.push({ type: "text", text: trimmed.slice(cursor) });
  }

  return nodes.length > 0 ? nodes : [{ type: "text", text: trimmed }];
}

export function parseNotesMarkdown(body: string): BlockNode[] {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const blocks: BlockNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const current = lines[i] ?? "";
    const trimmed = current.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    if (/^```/.test(trimmed)) {
      i += 1;
      const codeLines: string[] = [];
      while (i < lines.length && !/^```/.test((lines[i] ?? "").trim())) {
        codeLines.push(lines[i] ?? "");
        i += 1;
      }
      if (i < lines.length) i += 1;
      blocks.push({ type: "code-block", code: codeLines.join("\n") });
      continue;
    }

    const heading = current.match(/^\s{0,3}(#{1,6})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length as 1 | 2 | 3 | 4 | 5 | 6;
      blocks.push({
        type: "heading",
        level,
        inlines: parseInline(heading[2] ?? ""),
      });
      i += 1;
      continue;
    }

    if (/^\s*>\s?/.test(current)) {
      const quoteLines: InlineNode[][] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i] ?? "")) {
        const quoteLine = (lines[i] ?? "").replace(/^\s*>\s?/, "");
        quoteLines.push(parseInline(quoteLine));
        i += 1;
      }
      blocks.push({ type: "blockquote", lines: quoteLines });
      continue;
    }

    if (/^\s*[-*+]\s+/.test(current)) {
      const items: InlineNode[][] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i] ?? "")) {
        const content = (lines[i] ?? "").replace(/^\s*[-*+]\s+/, "");
        items.push(parseInline(content));
        i += 1;
      }
      blocks.push({ type: "unordered-list", items });
      continue;
    }

    if (/^\s*\d+\.\s+/.test(current)) {
      const items: InlineNode[][] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i] ?? "")) {
        const content = (lines[i] ?? "").replace(/^\s*\d+\.\s+/, "");
        items.push(parseInline(content));
        i += 1;
      }
      blocks.push({ type: "ordered-list", items });
      continue;
    }

    const paragraphLines: string[] = [];
    while (i < lines.length) {
      const line = lines[i] ?? "";
      const lineTrimmed = line.trim();
      if (!lineTrimmed) break;
      if (
        /^\s{0,3}(#{1,6})\s+/.test(line) ||
        /^\s*>\s?/.test(line) ||
        /^\s*[-*+]\s+/.test(line) ||
        /^\s*\d+\.\s+/.test(line) ||
        /^```/.test(lineTrimmed)
      ) {
        break;
      }

      paragraphLines.push(lineTrimmed);
      i += 1;
    }
    blocks.push({
      type: "paragraph",
      inlines: parseInline(paragraphLines.join(" ")),
    });
  }

  return blocks;
}
