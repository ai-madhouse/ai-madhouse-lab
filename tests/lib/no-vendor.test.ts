import { describe, expect, test } from "bun:test";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

async function exists(p: string) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

describe("project conventions", () => {
  test("does not vendor dependencies under vendor/", async () => {
    const vendorDir = path.join(process.cwd(), "vendor");
    expect(await exists(vendorDir)).toBe(false);
  });

  test("does not use file:./vendor dependencies", async () => {
    const pkgPath = path.join(process.cwd(), "package.json");
    const pkgText = await readFile(pkgPath, "utf8");
    const pkg = JSON.parse(pkgText) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      optionalDependencies?: Record<string, string>;
    };

    const fields = [
      pkg.dependencies ?? {},
      pkg.devDependencies ?? {},
      pkg.optionalDependencies ?? {},
    ];

    const offenders: Array<{ name: string; spec: string }> = [];

    for (const deps of fields) {
      for (const [name, spec] of Object.entries(deps)) {
        if (typeof spec === "string" && spec.startsWith("file:./vendor/")) {
          offenders.push({ name, spec });
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
