import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_SETTINGS,
  normalizeSettings,
  loadSettings,
  saveSettings,
  ALLOWED_KEYS,
  STORAGE_KEY,
} from "../src/settings.js";

/** Minimal chrome.storage.sync mock for Node unit tests. */
function installChromeMock(initial = {}) {
  /** @type {Record<string, unknown>} */
  let store = { ...initial };
  let shouldFailGet = false;
  let shouldFailSet = false;

  globalThis.chrome = {
    storage: {
      sync: {
        async get(key) {
          if (shouldFailGet) {
            throw new Error("sync get failed");
          }
          if (typeof key === "string") {
            return { [key]: store[key] };
          }
          return { ...store };
        },
        async set(obj) {
          if (shouldFailSet) {
            throw new Error("sync set failed");
          }
          store = { ...store, ...obj };
        },
        _dump() {
          return store;
        },
        _failGet(v) {
          shouldFailGet = v;
        },
        _failSet(v) {
          shouldFailSet = v;
        },
        _reset(next = {}) {
          store = { ...next };
          shouldFailGet = false;
          shouldFailSet = false;
        },
      },
    },
  };
}

describe("normalizeSettings", () => {
  it("returns defaults for empty input", () => {
    assert.deepEqual(normalizeSettings(undefined), DEFAULT_SETTINGS);
    assert.deepEqual(normalizeSettings(null), DEFAULT_SETTINGS);
    assert.deepEqual(normalizeSettings({}), DEFAULT_SETTINGS);
  });

  it("allowlists only known keys (never persists prompt)", () => {
    const next = normalizeSettings({
      defaultProviderId: "claude",
      openInNewTab: false,
      contextMenuEnabled: false,
      prompt: "secret should not persist",
      evil: true,
      nested: { x: 1 },
    });

    assert.deepEqual(next, {
      defaultProviderId: "claude",
      openInNewTab: false,
      contextMenuEnabled: false,
    });
    assert.equal("prompt" in next, false);
    assert.equal("evil" in next, false);
    assert.deepEqual([...ALLOWED_KEYS].sort(), [
      "contextMenuEnabled",
      "defaultProviderId",
      "openInNewTab",
    ]);
  });

  it("resets unknown provider ids to default", () => {
    const next = normalizeSettings({ defaultProviderId: "not-a-provider" });
    assert.equal(next.defaultProviderId, "grok");
  });

  it("coerces booleans strictly (truthy strings are false)", () => {
    const next = normalizeSettings({
      openInNewTab: "yes",
      contextMenuEnabled: 1,
    });
    assert.equal(next.openInNewTab, false);
    assert.equal(next.contextMenuEnabled, false);

    const ok = normalizeSettings({
      openInNewTab: true,
      contextMenuEnabled: true,
    });
    assert.equal(ok.openInNewTab, true);
    assert.equal(ok.contextMenuEnabled, true);
  });
});

describe("loadSettings / saveSettings", () => {
  beforeEach(() => {
    installChromeMock();
  });

  afterEach(() => {
    delete globalThis.chrome;
  });

  it("loadSettings returns defaults when storage is empty", async () => {
    const settings = await loadSettings();
    assert.deepEqual(settings, DEFAULT_SETTINGS);
  });

  it("loadSettings merges stored preferences", async () => {
    chrome.storage.sync._reset({
      [STORAGE_KEY]: {
        defaultProviderId: "perplexity",
        openInNewTab: false,
      },
    });
    const settings = await loadSettings();
    assert.equal(settings.defaultProviderId, "perplexity");
    assert.equal(settings.openInNewTab, false);
    assert.equal(settings.contextMenuEnabled, true);
  });

  it("loadSettings falls back to defaults when storage throws", async () => {
    chrome.storage.sync._failGet(true);
    const settings = await loadSettings();
    assert.deepEqual(settings, DEFAULT_SETTINGS);
  });

  it("saveSettings drops prompt and unknown keys from storage", async () => {
    await saveSettings({
      defaultProviderId: "chatgpt",
      prompt: "I should never be stored",
      extra: "nope",
    });

    const dumped = chrome.storage.sync._dump();
    assert.deepEqual(dumped[STORAGE_KEY], {
      defaultProviderId: "chatgpt",
      openInNewTab: true,
      contextMenuEnabled: true,
    });
    assert.equal(
      JSON.stringify(dumped).includes("I should never be stored"),
      false
    );
  });

  it("saveSettings rejects invalid provider ids", async () => {
    await saveSettings({ defaultProviderId: "made-up" });
    const settings = await loadSettings();
    assert.equal(settings.defaultProviderId, "grok");
  });

  it("saveSettings rethrows storage write failures", async () => {
    chrome.storage.sync._failSet(true);
    await assert.rejects(() => saveSettings({ openInNewTab: false }), /sync set failed/);
  });
});
