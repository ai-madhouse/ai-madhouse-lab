import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function readRepoFile(pathname: string) {
  return readFileSync(join(process.cwd(), pathname), "utf8");
}

test("dashboard route avoids server auth coupling in page shell", () => {
  const source = readRepoFile("src/app/[locale]/dashboard/page.tsx");
  expect(source.includes('from "@/lib/auth"')).toBe(false);
  expect(source.includes("isAuthenticated(")).toBe(false);
});

test("dashboard realtime card uses API + atoms + WS runtime flow", () => {
  const source = readRepoFile(
    "src/components/dashboard/realtime-card-content.tsx",
  );

  expect(source.includes('from "@/lib/runtime/app-atoms"')).toBe(true);
  expect(source.includes('from "@/lib/runtime/api-client"')).toBe(true);
  expect(source.includes('from "@/lib/runtime/ws-client"')).toBe(true);
  expect(source.includes("new WebSocket(")).toBe(false);
  expect(source.includes('fetch("/api/dashboard/metrics"')).toBe(false);
});
