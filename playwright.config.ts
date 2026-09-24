import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";

// Staging-only settings (gitignored). See e2e/README.md.
loadEnv({ path: ".env.e2e.local", quiet: true });

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "e2e/.report" }]],
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "https://staging.prismjet.space",
    storageState: "e2e/.auth/user.json",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  // Local runs start the dev server against staging (npm run dev:staging) unless one is already up.
  webServer: /localhost/.test(process.env.E2E_BASE_URL ?? "")
    ? { command: "npm run dev:staging", url: "http://localhost:3005/login", reuseExistingServer: true, timeout: 180_000 }
    : undefined,
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } }],
});
