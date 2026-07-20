import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright Test Configuration
 *
 * - Runs tests located in ./tests/e2e
 * - Starts the Vite dev server before tests (`npm run dev`)
 * - Uses the default Vite port 5173
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: true,
  reporter: "list",
  use: {
    // Base URL points to the Vite dev server
    baseURL: "http://localhost:5173",
    // Capture trace on first retry for debugging
    trace: "on-first-retry",
    headless: true,
  },
  // Automatically start the dev server before the test suite runs
  webServer: {
    command: "npm run dev",
    port: 5173,
    timeout: 120_000,
    // Reuse an existing server when running locally to speed up iteration
    reuseExistingServer: !process.env.CI,
  },
});
