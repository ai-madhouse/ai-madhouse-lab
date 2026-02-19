export const MAIN_CHECKOUT_PATH = "/srv/projects/ai-madhouse-lab";
export const WORKTREE_PARENT_PATH = "/srv/projects/worktrees/ai-madhouse-lab";

export const SHARED_ROOT_PATHS = [
  MAIN_CHECKOUT_PATH,
  "/srv/projects/worktrees",
  WORKTREE_PARENT_PATH,
] as const;

export const FORBIDDEN_TRACKED_PATH_PREFIXES = [
  "playwright-report/",
  "test-results/",
  "blob-report/",
  "coverage/",
  ".nyc_output/",
  "artifacts/",
] as const;

export const TASK_BRANCH_PATTERN =
  /^vk\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-[a-z0-9][a-z0-9-]*$/;

export function normalizeGitPath(filePath: string) {
  return filePath.replaceAll("\\", "/").replace(/^\.\/+/, "");
}

export function isForbiddenTrackedPath(filePath: string) {
  const normalizedPath = normalizeGitPath(filePath);
  return FORBIDDEN_TRACKED_PATH_PREFIXES.some((prefix) =>
    normalizedPath.startsWith(prefix),
  );
}

export function isManagedVpsRepoPath(repoPath: string) {
  return (
    repoPath === MAIN_CHECKOUT_PATH ||
    repoPath.startsWith(`${WORKTREE_PARENT_PATH}/`) ||
    repoPath.startsWith("/srv/projects/")
  );
}

export function isWorktreePath(repoPath: string) {
  return repoPath.startsWith(`${WORKTREE_PARENT_PATH}/`);
}

export function hasGroupWriteExecute(mode: number) {
  return (mode & 0o020) !== 0 && (mode & 0o010) !== 0;
}
