import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { defineConfig } from "@playwright/test";

const PORT = Number(process.env.PW_PORT || process.env.PORT || "3005");
const REALTIME_PORT = Number(process.env.PW_REALTIME_PORT || `${PORT + 4000}`);
const RUN_ID =
  process.env.PW_RUN_ID ||
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
const TMP_DIR = path.join(process.cwd(), "tmp", "e2e", RUN_ID);
const DB_PATH = path.join(TMP_DIR, "app.db");
const AUTH_SECRET = "playwright-test-secret";
const APP_URL = `http://localhost:${PORT}`;
const REALTIME_URL = `http://localhost:${REALTIME_PORT}`;

rmSync(TMP_DIR, { recursive: true, force: true });
mkdirSync(TMP_DIR, { recursive: true });

process.env.PW_E2E_RUN_ID = RUN_ID;
process.env.PW_E2E_TMP_DIR = TMP_DIR;
process.env.PW_E2E_DB_PATH = DB_PATH;

const sharedEnv = [
  `NODE_ENV=production`,
  `E2E_TEST=1`,
  `AUTH_SECRET=${AUTH_SECRET}`,
  `REALTIME_SECRET=${AUTH_SECRET}`,
  `DB_PATH=${DB_PATH}`,
  `REALTIME_PORT=${REALTIME_PORT}`,
  `NEXT_PUBLIC_REALTIME_PORT=${REALTIME_PORT}`,
  `REALTIME_URL=${REALTIME_URL}`,
].join(" ");

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  workers: 1,
  retries: 0,
  use: {
    baseURL: APP_URL,
    headless: true,
    screenshot: "off",
    video: "off",
    trace: "off",
    launchOptions: {
      // Try to ensure Reporting API is enabled in headless.
      args: [
        "--enable-features=Reporting",
        "--enable-blink-features=Reporting",
      ],
    },
  },
  globalTeardown: "./e2e/global-teardown.ts",
  webServer: [
    {
      command: `cross-env ${sharedEnv} bun run realtime`,
      url: `${REALTIME_URL}/health`,
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      // `next start` requires a build. Run `bun run build` before `bun run e2e`.
      command: `cross-env ${sharedEnv} PORT=${PORT} SENTRY_DSN=https://4646900ef519dfe814da453cc50e3ad9@o1113565.ingest.us.sentry.io/4510823535411200 bun run start -- -p ${PORT}`,
      url: APP_URL,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
