import { defineConfig } from "@playwright/test";

const PORT = Number(process.env.PW_PORT || process.env.PORT || "3005");

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: 0,
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    headless: true,
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    // `next start` requires a build. Run `bun run build` before `bun run e2e`.
    command: `PORT=${PORT} NODE_ENV=production AUTH_SECRET=playwright-test-secret bun run start -- -p ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
