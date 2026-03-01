import { rm } from "node:fs/promises";
import path from "node:path";

import type { FullConfig } from "@playwright/test";

function isE2eTmpDir(input: string) {
  const normalized = path.normalize(input);
  return normalized.includes(`${path.sep}tmp${path.sep}e2e${path.sep}`);
}

function hasErrorCode(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === "object" && error !== null && "code" in error;
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const RETRYABLE_DELETE_CODES = new Set<string>([
  "EBUSY",
  "EPERM",
  "ENOTEMPTY",
]);
const MAX_DELETE_ATTEMPTS = 8;
const RETRY_DELAY_MS = 150;

async function removeTmpDirWithRetry(tmpDir: string) {
  for (let attempt = 1; attempt <= MAX_DELETE_ATTEMPTS; attempt += 1) {
    try {
      await rm(tmpDir, { recursive: true, force: true });
      return;
    } catch (error) {
      if (!hasErrorCode(error)) {
        throw error;
      }

      const code = error.code;
      if (!code || !RETRYABLE_DELETE_CODES.has(code)) {
        throw error;
      }

      if (attempt === MAX_DELETE_ATTEMPTS) {
        console.warn(
          `[e2e teardown] failed to remove ${tmpDir} after ${MAX_DELETE_ATTEMPTS} attempts (${code}); continuing`,
        );
        return;
      }

      await sleep(RETRY_DELAY_MS * attempt);
    }
  }
}

export default async function globalTeardown(_config: FullConfig) {
  const tmpDir = process.env.PW_E2E_TMP_DIR?.trim();
  if (!tmpDir || !isE2eTmpDir(tmpDir)) {
    return;
  }

  await removeTmpDirWithRetry(tmpDir);
}
