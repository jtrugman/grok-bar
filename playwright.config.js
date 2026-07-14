import { defineConfig } from "@playwright/test";

/**
 * Extension smoke tests use Playwright's bundled Chromium + load-extension.
 * Google Chrome branded builds no longer allow --load-extension; Chromium does.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: {
    timeout: 15_000,
  },
  reporter: process.env.CI ? [["list"], ["github"]] : [["list"]],
  use: {
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium-extension",
      use: {
        // channel omitted → Playwright Chromium (required for --load-extension)
      },
    },
  ],
});
