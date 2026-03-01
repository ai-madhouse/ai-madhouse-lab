import { rm } from "node:fs/promises";
import path from "node:path";

import type { FullConfig } from "@playwright/test";

function isE2eTmpDir(input: string) {
  const normalized = path.normalize(input);
  return normalized.includes(`${path.sep}tmp${path.sep}e2e${path.sep}`);
}

async function removeDirIfExists(target: string) {
  try {
    await rm(target, { recursive: true, force: true });
  } catch (error) {
    throw new Error(
      `[e2e teardown] failed to remove ${target}: ${String(error)}`,
    );
  }
}

export default async function globalTeardown(_config: FullConfig) {
  const tmpDir = process.env.PW_E2E_TMP_DIR?.trim();
  if (!tmpDir || !isE2eTmpDir(tmpDir)) {
    return;
  }

  // Deterministic teardown: single-pass cleanup, no retries/backoff.
  await removeDirIfExists(tmpDir);

  // Also remove parent e2e/tmp folders so no tmp artifacts remain.
  const e2eRoot = path.dirname(tmpDir); // .../tmp/e2e
  const tmpRoot = path.dirname(e2eRoot); // .../tmp

  await removeDirIfExists(e2eRoot);
  await removeDirIfExists(tmpRoot);
}
