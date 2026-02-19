import { execFileSync } from "node:child_process";
import { lstat } from "node:fs/promises";
import { EOL } from "node:os";
import {
  hasGroupWriteExecute,
  isForbiddenTrackedPath,
  isManagedVpsRepoPath,
  isWorktreePath,
  MAIN_CHECKOUT_PATH,
  SHARED_ROOT_PATHS,
  TASK_BRANCH_PATTERN,
} from "../src/lib/repo-hygiene";

type PreflightIssue = {
  title: string;
  detail: string;
  fix: string;
};

function git(args: string[]) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

async function validate() {
  const issues: PreflightIssue[] = [];
  const isCi = process.env.CI === "true";

  const topLevel = git(["rev-parse", "--show-toplevel"]);
  const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]);
  const trackedRaw = execFileSync("git", ["ls-files", "-z"], {
    encoding: "utf8",
  });
  const tracked = trackedRaw.split("\0").filter(Boolean);

  const forbiddenTracked = tracked.filter((filePath) =>
    isForbiddenTrackedPath(filePath),
  );
  if (forbiddenTracked.length > 0) {
    issues.push({
      title: "Forbidden tracked artifact paths detected",
      detail: forbiddenTracked.slice(0, 8).join(", "),
      fix: "Remove and untrack artifacts (e.g. `git rm --cached <path>`).",
    });
  }

  for (const filePath of tracked) {
    const stats = await lstat(filePath);
    if (stats.uid === 0) {
      issues.push({
        title: "Root-owned tracked file detected",
        detail: filePath,
        fix: `Run \`sudo chown -R $(id -un):$(id -gn) ${topLevel}\` in the worktree.`,
      });
      break;
    }
  }

  if (!isCi && isManagedVpsRepoPath(topLevel)) {
    if (topLevel === MAIN_CHECKOUT_PATH) {
      issues.push({
        title: "Main checkout is not an allowed working directory",
        detail: topLevel,
        fix: "Switch to a task worktree under /srv/projects/worktrees/ai-madhouse-lab/<task-id>/.",
      });
    } else if (!isWorktreePath(topLevel)) {
      issues.push({
        title: "Repository path is outside managed worktree layout",
        detail: topLevel,
        fix: "Use a task worktree under /srv/projects/worktrees/ai-madhouse-lab/<task-id>/.",
      });
    }

    if (branch === "main" || branch === "master") {
      issues.push({
        title: "Protected branch checked out",
        detail: branch,
        fix: "Use a task branch: vk/<task-id>-<slug>.",
      });
    } else if (!TASK_BRANCH_PATTERN.test(branch)) {
      issues.push({
        title: "Branch does not follow task naming policy",
        detail: branch,
        fix: "Rename branch to vk/<task-id>-<slug>.",
      });
    }

    const repoStats = await lstat(topLevel);
    if (!hasGroupWriteExecute(repoStats.mode)) {
      issues.push({
        title: "Worktree directory is not group-writable/executable",
        detail: `${topLevel} mode=${(repoStats.mode & 0o7777).toString(8)}`,
        fix: `Run \`chmod 2775 ${topLevel}\`.`,
      });
    }

    for (const sharedPath of SHARED_ROOT_PATHS) {
      try {
        const sharedStats = await lstat(sharedPath);
        const mode = sharedStats.mode & 0o7777;
        if (mode !== 0o2775) {
          issues.push({
            title: "Shared repository root permissions drifted from 2775",
            detail: `${sharedPath} mode=${mode.toString(8)}`,
            fix: `Run \`chmod 2775 ${sharedPath}\`.`,
          });
        }
      } catch {
        // Skip on hosts where these roots are unavailable.
      }
    }
  }

  return issues;
}

async function main() {
  try {
    const issues = await validate();
    if (issues.length === 0) {
      console.log("repo-preflight: ok");
      return;
    }

    console.error(`repo-preflight: failed (${issues.length} issue(s))`);
    for (const issue of issues) {
      console.error(
        `- ${issue.title}${EOL}  detail: ${issue.detail}${EOL}  fix: ${issue.fix}`,
      );
    }
    process.exit(1);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`repo-preflight: error${EOL}${message}`);
    process.exit(1);
  }
}

await main();
