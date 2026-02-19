import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import {
  hasGroupWriteExecute,
  isForbiddenTrackedPath,
  TASK_BRANCH_PATTERN,
} from "@/lib/repo-hygiene";

describe("repo hygiene guardrails", () => {
  test("forbidden artifact prefixes are blocked", () => {
    expect(isForbiddenTrackedPath("playwright-report/index.html")).toBe(true);
    expect(isForbiddenTrackedPath("test-results/run-1/output.txt")).toBe(true);
    expect(isForbiddenTrackedPath("blob-report/report.zip")).toBe(true);
    expect(isForbiddenTrackedPath("coverage/lcov.info")).toBe(true);
    expect(isForbiddenTrackedPath("src/app/page.tsx")).toBe(false);
    expect(isForbiddenTrackedPath("./src/lib/utils.ts")).toBe(false);
  });

  test("task branch naming policy accepts canonical branch names", () => {
    expect(
      TASK_BRANCH_PATTERN.test(
        "vk/51f92b37-7502-4ee5-a4ed-1069352754fb-automate-repo-hygiene-guardrails-worktree",
      ),
    ).toBe(true);
    expect(TASK_BRANCH_PATTERN.test("main")).toBe(false);
    expect(
      TASK_BRANCH_PATTERN.test(
        "feature/51f92b37-7502-4ee5-a4ed-1069352754fb-guardrails",
      ),
    ).toBe(false);
  });

  test("permission helper requires group write+execute bits", () => {
    expect(hasGroupWriteExecute(0o2775)).toBe(true);
    expect(hasGroupWriteExecute(0o2755)).toBe(false);
  });

  test("lint script includes repo preflight", async () => {
    const packagePath = `${process.cwd()}/package.json`;
    const packageRaw = await readFile(packagePath, "utf8");
    const packageJson = JSON.parse(packageRaw) as {
      scripts?: Record<string, string>;
    };
    expect(packageJson.scripts?.lint).toContain("bun run preflight");
  });
});
