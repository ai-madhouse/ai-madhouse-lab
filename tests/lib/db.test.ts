import { describe, expect, test } from "bun:test";
import os from "node:os";
import path from "node:path";

import { createClient } from "@libsql/client";

describe("db", () => {
  test("sanity: can create/open sqlite db and read/write", async () => {
    const dbPath = path.join(
      os.tmpdir(),
      `ai-madhouse-lab-test-${Date.now()}.db`,
    );
    const client = createClient({ url: `file:${dbPath}` });

    await client.execute("PRAGMA foreign_keys = ON");
    await client.execute(
      "CREATE TABLE IF NOT EXISTS notes (id TEXT PRIMARY KEY, title TEXT NOT NULL, body TEXT NOT NULL DEFAULT '')",
    );

    await client.execute({
      sql: "insert into notes(id,title,body) values(?,?,?)",
      args: ["n1", "Hello", "World"],
    });

    const row = await client.execute({
      sql: "select id, title, body from notes where id = ?",
      args: ["n1"],
    });

    const note = row.rows[0];
    expect(note?.id).toBe("n1");
    expect(note?.title).toBe("Hello");
    expect(note?.body).toBe("World");
  });
});
