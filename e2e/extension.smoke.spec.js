import { test as base, expect, chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GROK_SEARCH_PROVIDER } from "../src/search-provider-contract.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const extensionPath = path.resolve(repoRoot, ".e2e-extension");

function ensurePackedExtension() {
  execFileSync(process.execPath, ["scripts/pack-extension.js"], {
    cwd: repoRoot,
    stdio: "inherit",
  });
  if (!fs.existsSync(path.join(extensionPath, "manifest.json"))) {
    throw new Error("pack-extension did not produce .e2e-extension/manifest.json");
  }
}

/**
 * Fixtures: persistent Chromium context with a clean packed extension loaded.
 * Extensions require headed Chromium (use xvfb-run on Linux CI).
 *
 * @see https://playwright.dev/docs/chrome-extensions
 */
const test = base.extend({
  context: async ({}, use, testInfo) => {
    ensurePackedExtension();

    const userDataDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "search-with-grok-e2e-")
    );

    const context = await chromium.launchPersistentContext(userDataDir, {
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
    expect(searchProvider).toMatchObject(GROK_SEARCH_PROVIDER);
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
    expect(manifest.chrome_settings_overrides.search_provider).toMatchObject(
      GROK_SEARCH_PROVIDER
    );
  });
});
