import { defineConfig, devices } from "@playwright/test";

const port = process.env.E2E_PORT ?? "3000";

export default defineConfig({
  testDir: "./e2e",
  timeout: 180_000,
  expect: { timeout: 12_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium-mobile",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "firefox-desktop",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit-mobile",
      timeout: 360_000,
      use: { ...devices["iPhone 13"] },
    },
  ],
  webServer: {
    command: `pnpm exec next dev --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.E2E_PORT,
    timeout: 120_000,
  },
});
