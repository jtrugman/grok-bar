import { DEFAULT_PROVIDER_ID, getProvider } from "./providers/index.js";

const STORAGE_KEY = "settings";

/** Only these keys may be persisted. Unknown properties are dropped. */
const ALLOWED_KEYS = /** @type {const} */ ([
  "defaultProviderId",
  "openInNewTab",
  "contextMenuEnabled",
]);

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
 * Coerce and allowlist a partial settings object.
 * Never persists prompts or unknown keys (privacy invariant enforced in code).
 *
 * @param {unknown} input
 * @param {ExtensionSettings} [base]
 * @returns {ExtensionSettings}
 */
export function normalizeSettings(input, base = DEFAULT_SETTINGS) {
  const raw =
    input && typeof input === "object" && !Array.isArray(input)
      ? /** @type {Record<string, unknown>} */ (input)
      : {};

  /** @type {ExtensionSettings} */
  const next = { ...base };

  if (Object.prototype.hasOwnProperty.call(raw, "defaultProviderId")) {
    const id = raw.defaultProviderId;
    next.defaultProviderId =
      typeof id === "string" && getProvider(id) ? id : DEFAULT_PROVIDER_ID;
  }

  if (Object.prototype.hasOwnProperty.call(raw, "openInNewTab")) {
    next.openInNewTab = raw.openInNewTab === true;
  }

  if (Object.prototype.hasOwnProperty.call(raw, "contextMenuEnabled")) {
    next.contextMenuEnabled = raw.contextMenuEnabled === true;
  }

  // Drop anything else by reconstruction (defense in depth).
  return {
    defaultProviderId: getProvider(next.defaultProviderId)
      ? next.defaultProviderId
      : DEFAULT_PROVIDER_ID,
    openInNewTab: next.openInNewTab === true,
    contextMenuEnabled: next.contextMenuEnabled === true,
  };
}

/**
 * Load settings from chrome.storage.sync. Never reads or stores prompts.
 *
 * On storage failure we intentionally fall back to defaults so the service
 * worker can still open tabs; the error is logged for diagnosis.
 *
 * @returns {Promise<ExtensionSettings>}
 */
export async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get(STORAGE_KEY);
    return normalizeSettings(result[STORAGE_KEY], DEFAULT_SETTINGS);
  } catch (err) {
    // Intentional degraded mode: SW must remain usable if sync storage is broken.
    console.warn("AI Omnibox: loadSettings failed; using defaults", String(err));
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Persist settings. Only preference data is written (never prompts).
 * @param {Partial<ExtensionSettings> | Record<string, unknown>} partial
 * @returns {Promise<ExtensionSettings>}
 */
export async function saveSettings(partial) {
  const current = await loadSettings();
  const next = normalizeSettings(partial, current);

  try {
    await chrome.storage.sync.set({ [STORAGE_KEY]: next });
  } catch (err) {
    console.error("AI Omnibox: saveSettings failed", String(err));
    throw err;
  }

  return next;
}

export { ALLOWED_KEYS, STORAGE_KEY };
