import { defineConfig } from "@playwright/test";

const PORT = Number(process.env.PW_PORT || process.env.PORT || "3005");

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: 0,
  use: {
    baseURL: `http://localhost:${PORT}`,
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
  webServer: {
    // `next start` requires a build. Run `bun run build` before `bun run e2e`.
    command: `cross-env PORT=${PORT} NODE_ENV=production E2E_TEST=1 AUTH_SECRET=playwright-test-secret SENTRY_DSN=https://4646900ef519dfe814da453cc50e3ad9@o1113565.ingest.us.sentry.io/4510823535411200 bun run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
