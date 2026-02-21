import {
  type InlineNode,
  parseNotesMarkdown,
} from "@/lib/notes-markdown-render";

function createUniqueKeyFactory() {
  const counts = new Map<string, number>();
  return (base: string) => {
    const next = (counts.get(base) ?? 0) + 1;
    counts.set(base, next);
    return `${base}:${next}`;
  };
}

function inlineNodeKey(node: InlineNode) {
  if (node.type === "link") return `${node.type}:${node.text}:${node.href}`;
  return `${node.type}:${node.text}`;
}

function renderInline(nodes: InlineNode[]) {
  const keyFor = createUniqueKeyFactory();
  return nodes.map((node) => {
    const key = keyFor(inlineNodeKey(node));

    if (node.type === "text") return <span key={key}>{node.text}</span>;
    if (node.type === "strong") return <strong key={key}>{node.text}</strong>;
    if (node.type === "emphasis") return <em key={key}>{node.text}</em>;
    if (node.type === "code") {
      return (
        <code
          key={key}
          className="rounded border border-border/70 bg-muted/60 px-1 py-0.5 font-mono text-[0.9em]"
        >
          {node.text}
        </code>
      );
    }

    return (
      <a
        key={key}
        href={node.href}
        target="_blank"
        rel="noreferrer noopener"
        className="underline decoration-primary/60 underline-offset-2 transition hover:text-primary"
      >
        {node.text}
      </a>
    );
  });
}

export function NoteMarkdownContent({ body }: { body: string }) {
  const blocks = parseNotesMarkdown(body);
  if (blocks.length === 0) {
    return <p className="text-sm italic text-muted-foreground">Empty note.</p>;
  }

  const keyForBlock = createUniqueKeyFactory();
  return (
    <div className="space-y-3 text-sm leading-6 text-foreground">
      {blocks.map((block) => {
        const key = keyForBlock(JSON.stringify(block));

        if (block.type === "heading") {
          const classesByLevel: Record<typeof block.level, string> = {
            1: "text-2xl font-semibold",
            2: "text-xl font-semibold",
            3: "text-lg font-semibold",
            4: "text-base font-semibold",
            5: "text-sm font-semibold",
            6: "text-sm font-semibold text-muted-foreground",
          };
          const HeadingTag = `h${block.level}` as
            | "h1"
            | "h2"
            | "h3"
            | "h4"
            | "h5"
            | "h6";
          return (
            <HeadingTag key={key} className={classesByLevel[block.level]}>
              {renderInline(block.inlines)}
            </HeadingTag>
          );
        }

        if (block.type === "paragraph") {
          return <p key={key}>{renderInline(block.inlines)}</p>;
        }

        if (block.type === "unordered-list") {
          const keyForItem = createUniqueKeyFactory();
          return (
            <ul key={key} className="ml-5 list-disc space-y-1">
              {block.items.map((item) => (
                <li key={keyForItem(JSON.stringify(item))}>
                  {renderInline(item)}
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === "ordered-list") {
          const keyForItem = createUniqueKeyFactory();
          return (
            <ol key={key} className="ml-5 list-decimal space-y-1">
              {block.items.map((item) => (
                <li key={keyForItem(JSON.stringify(item))}>
                  {renderInline(item)}
                </li>
              ))}
            </ol>
          );
        }

        if (block.type === "blockquote") {
          const keyForLine = createUniqueKeyFactory();
          return (
            <blockquote
              key={key}
              className="space-y-1 border-l-2 border-border/70 pl-3 text-muted-foreground"
            >
              {block.lines.map((line) => (
                <p key={keyForLine(JSON.stringify(line))}>
                  {renderInline(line)}
                </p>
              ))}
            </blockquote>
          );
        }

        return (
          <pre
            key={key}
            className="overflow-x-auto rounded-xl border border-border/70 bg-muted/40 p-3 font-mono text-xs leading-5"
          >
            <code>{block.code}</code>
          </pre>
        );
      })}
    </div>
  );
}
