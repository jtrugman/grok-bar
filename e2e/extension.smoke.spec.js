import { test as base, expect, chromium } from "@playwright/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extensionPath = path.resolve(__dirname, "..");

/**
 * Fixtures: persistent Chromium context with this extension loaded unpacked.
 *
 * Playwright's bundled Chromium still supports --load-extension.
 * Extensions require headed mode (use xvfb-run on Linux CI).
 *
 * @see https://playwright.dev/docs/chrome-extensions
 */
const test = base.extend({
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, use, testInfo) => {
    const userDataDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "search-with-grok-e2e-")
    );

    const context = await chromium.launchPersistentContext(userDataDir, {
      // Headless Chromium does not load extensions via --load-extension.
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        "--no-first-run",
        "--disable-default-apps",
        "--disable-sync",
      ],
    });

    try {
      await use(context);
    } finally {
      await context.close();
      try {
        fs.rmSync(userDataDir, { recursive: true, force: true });
      } catch {
        // Best-effort cleanup; temp dirs may be locked briefly on CI.
        testInfo.annotations.push({
          type: "note",
          description: `Could not remove temp profile ${userDataDir}`,
        });
      }
    }
  },

  extensionId: async ({ context }, use) => {
    let worker = context.serviceWorkers()[0];
    if (!worker) {
      worker = await context.waitForEvent("serviceworker", { timeout: 30_000 });
    }
    const extensionId = new URL(worker.url()).host;
    await use(extensionId);
  },
});

test.describe("Search with Grok — extension smoke", () => {
  test("loads unpacked extension service worker", async ({ extensionId }) => {
    expect(extensionId).toBeTruthy();
    expect(extensionId.length).toBeGreaterThan(10);
    // Chrome extension IDs are 32 lowercase a-p characters.
    expect(extensionId).toMatch(/^[a-p]{32}$/);
  });

  test("options page renders first-time guidance", async ({
    context,
    extensionId,
  }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options/options.html`);

    await expect(page.locator("h1")).toContainText(/Grok/i);
    await expect(page.locator("body")).toContainText(/default search/i);
    await expect(page.locator("body")).toContainText(
      /chrome:\/\/settings\/searchEngines/i
    );
  });

  test("runtime manifest registers Grok as default search provider", async ({
    context,
    extensionId,
  }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options/options.html`);

    const searchProvider = await page.evaluate(() => {
      const manifest = chrome.runtime.getManifest();
      return manifest.chrome_settings_overrides?.search_provider ?? null;
    });

    expect(searchProvider).not.toBeNull();
    expect(searchProvider.name).toMatch(/Grok/i);
    expect(searchProvider.search_url).toBe(
      "https://grok.com/?q={searchTerms}"
    );
    expect(searchProvider.is_default).toBe(true);
    expect(searchProvider.encoding).toBe("UTF-8");
  });

  test("extension pages resolve icons and background entry", async ({
    context,
    extensionId,
  }) => {
    const page = await context.newPage();
    const iconResponse = await page.goto(
      `chrome-extension://${extensionId}/icons/icon16.png`
    );
    expect(iconResponse?.ok()).toBeTruthy();

    const manifest = await page.evaluate(async (id) => {
      const res = await fetch(`chrome-extension://${id}/manifest.json`);
      return res.json();
    }, extensionId);

    expect(manifest.background?.service_worker).toBe("src/background.js");
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.chrome_settings_overrides.search_provider.search_url).toBe(
      "https://grok.com/?q={searchTerms}"
    );
  });
});
