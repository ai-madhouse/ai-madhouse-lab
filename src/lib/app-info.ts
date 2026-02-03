import { readFileSync } from "node:fs";
import path from "node:path";

function readPackageVersion(): string | undefined {
  try {
    const packageJsonPath = path.join(process.cwd(), "package.json");
    const raw = readFileSync(packageJsonPath, "utf8");
    const parsed = JSON.parse(raw) as { version?: unknown };
    return typeof parsed.version === "string" ? parsed.version : undefined;
  } catch {
    return undefined;
  }
}

function readGitCommitFromFs(): string | undefined {
  try {
    const gitDir = path.join(process.cwd(), ".git");
    const head = readFileSync(path.join(gitDir, "HEAD"), "utf8").trim();

    if (head.startsWith("ref:")) {
      const refPath = head.replace(/^ref:\s*/, "").trim();
      const refFullPath = path.join(gitDir, refPath);
      return readFileSync(refFullPath, "utf8").trim() || undefined;
    }

    return head || undefined;
  } catch {
    return undefined;
  }
}

export function getAppInfo() {
  const version = process.env.APP_VERSION?.trim() || readPackageVersion();

  const commit =
    process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
    process.env.GIT_COMMIT_SHA?.trim() ||
    process.env.COMMIT_SHA?.trim() ||
    readGitCommitFromFs();

  return {
    version: version || undefined,
    commit: commit || undefined,
  };
}
