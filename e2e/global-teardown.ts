import { rmSync } from "node:fs";
import path from "node:path";

import type { FullConfig } from "@playwright/test";

function isE2eTmpDir(input: string) {
  const normalized = path.normalize(input);
  return normalized.includes(`${path.sep}tmp${path.sep}e2e${path.sep}`);
}

export default function globalTeardown(_config: FullConfig) {
  const tmpDir = process.env.PW_E2E_TMP_DIR?.trim();
  if (!tmpDir || !isE2eTmpDir(tmpDir)) {
    return;
  }

  rmSync(tmpDir, { recursive: true, force: true });
}
