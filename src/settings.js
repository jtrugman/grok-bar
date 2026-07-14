import { DEFAULT_PROVIDER_ID, getProvider } from "./providers/index.js";

const STORAGE_KEY = "settings";

/**
 * @typedef {object} ExtensionSettings
 * @property {string} defaultProviderId
 * @property {boolean} openInNewTab
 * @property {boolean} contextMenuEnabled
 */

/** @type {ExtensionSettings} */
export const DEFAULT_SETTINGS = {
  defaultProviderId: DEFAULT_PROVIDER_ID,
  openInNewTab: true,
  contextMenuEnabled: true,
};

/**
 * Load settings from chrome.storage.sync. Never reads or stores prompts.
 * @returns {Promise<ExtensionSettings>}
 */
export async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get(STORAGE_KEY);
    const stored = result[STORAGE_KEY] ?? {};
    const merged = { ...DEFAULT_SETTINGS, ...stored };

    // Guard against a removed provider id.
    if (!getProvider(merged.defaultProviderId)) {
      merged.defaultProviderId = DEFAULT_PROVIDER_ID;
    }

    return merged;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Persist settings. Only preference data is written (never prompts).
 * @param {Partial<ExtensionSettings>} partial
 * @returns {Promise<ExtensionSettings>}
 */
export async function saveSettings(partial) {
  const current = await loadSettings();
  const next = { ...current, ...partial };

  if (!getProvider(next.defaultProviderId)) {
    next.defaultProviderId = DEFAULT_PROVIDER_ID;
  }

  await chrome.storage.sync.set({ [STORAGE_KEY]: next });
  return next;
}
