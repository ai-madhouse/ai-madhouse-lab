import { describe, expect, test } from "bun:test";
import os from "node:os";
import path from "node:path";

describe("db health", () => {
  test("dbHealthCheck returns ok and points to a writable db path", async () => {
    const dbPath = path.join(
      os.tmpdir(),
      `ai-madhouse-lab-health-${Date.now()}.db`,
    );

    process.env.DB_PATH = dbPath;

    // Import after setting env so the db singleton uses the test path.
    const mod = (await import("@/lib/db")) as typeof import("@/lib/db");

    const res = await mod.dbHealthCheck();

    expect(res.ok).toBe(true);
    expect(res.dbPath).toBe(dbPath);
  });
});
