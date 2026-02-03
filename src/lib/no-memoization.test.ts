import { describe, expect, test } from "bun:test";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const banned = ["useMemo", "useCallback"];

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const out: string[] = [];
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules" || ent.name === ".next") continue;
      out.push(...(await walk(full)));
    } else if (ent.isFile()) {
      if (full.endsWith(".ts") || full.endsWith(".tsx")) out.push(full);
    }
  }
  return out;
}

describe("project conventions", () => {
  test("avoid useMemo/useCallback in src", async () => {
    const root = path.join(process.cwd(), "src");
    const files = await walk(root);

    const violations: Array<{ file: string; token: string }> = [];

    for (const file of files) {
      if (file.endsWith("no-memoization.test.ts")) continue;
      const text = await readFile(file, "utf8");
      for (const token of banned) {
        if (text.includes(token)) violations.push({ file, token });
      }
    }

    expect(violations).toEqual([]);
  });
});
