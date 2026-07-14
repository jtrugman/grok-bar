/**
 * AI Omnibox — service worker
 *
 * Flow:
 *   Omnibox / context menu
 *     → load settings (preferences only; never prompts)
 *     → routeQuery (provider + buildURL)
 *     → chrome.tabs API
 *
 * Privacy: prompts are not written to storage, history, or logs.
 */

import { routeQuery, buildSuggestions } from "./router.js";
import { loadSettings, saveSettings } from "./settings.js";
import { resolveProvider } from "./providers/index.js";

const CONTEXT_MENU_ID = "ai-omnibox-ask";

// ---------------------------------------------------------------------------
// Omnibox
// ---------------------------------------------------------------------------

chrome.omnibox.onInputChanged.addListener(async (text, suggest) => {
  const settings = await loadSettings();
  suggest(buildSuggestions(text, settings.defaultProviderId));
});

chrome.omnibox.onInputEntered.addListener(async (text, disposition) => {
  const settings = await loadSettings();
  const routed = routeQuery(text, settings.defaultProviderId);
  if (!routed) {
    return;
  }

  await openUrl(routed.url, disposition, settings.openInNewTab);
});

chrome.omnibox.onInputStarted.addListener(async () => {
  const settings = await loadSettings();
  const provider = resolveProvider(settings.defaultProviderId);
  chrome.omnibox.setDefaultSuggestion({
    description: `Ask ${provider.name} (prefix with grok / chatgpt / claude / perplexity / gemini to switch)`,
  });
});

// ---------------------------------------------------------------------------
// Context menu (selected text → default provider)
// ---------------------------------------------------------------------------

async function ensureContextMenu() {
  const settings = await loadSettings();
  await chrome.contextMenus.removeAll();

  if (!settings.contextMenuEnabled) {
    return;
  }

  const provider = resolveProvider(settings.defaultProviderId);
  chrome.contextMenus.create({
    id: CONTEXT_MENU_ID,
    title: `Ask ${provider.name}: “%s”`,
    contexts: ["selection"],
  });
}

chrome.runtime.onInstalled.addListener(async () => {
  await ensureContextMenu();
});

chrome.runtime.onStartup.addListener(async () => {
  await ensureContextMenu();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.settings) {
    ensureContextMenu();
  }
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== CONTEXT_MENU_ID) {
    return;
  }

  const selection = (info.selectionText ?? "").trim();
  if (!selection) {
    return;
  }

  const settings = await loadSettings();
  const routed = routeQuery(selection, settings.defaultProviderId);
  if (!routed) {
    return;
  }

  await openUrl(routed.url, "newForegroundTab", true);
});

// Open options when the toolbar icon is clicked.
chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});

// ---------------------------------------------------------------------------
// Tab navigation
// ---------------------------------------------------------------------------

/**
 * @param {string} url
 * @param {chrome.omnibox.OnInputEnteredDisposition} disposition
 * @param {boolean} preferNewTab
 */
async function openUrl(url, disposition, preferNewTab) {
  // Modifier-key dispositions from Chrome win over the preference.
  if (disposition === "newBackgroundTab") {
    await chrome.tabs.create({ url, active: false });
    return;
  }

  if (disposition === "newForegroundTab") {
    await chrome.tabs.create({ url, active: true });
    return;
  }

  // disposition === "currentTab" (plain Enter): honor the open-in-new-tab setting.
  if (preferNewTab) {
    await chrome.tabs.create({ url, active: true });
    return;
  }

  await chrome.tabs.update({ url });
}

// Expose settings helpers for the options page via messaging (optional).
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "getSettings") {
    loadSettings().then(sendResponse);
    return true;
  }
  if (message?.type === "saveSettings" && message.payload) {
    saveSettings(message.payload).then(async (settings) => {
      await ensureContextMenu();
      sendResponse(settings);
    });
    return true;
  }
  return false;
});
