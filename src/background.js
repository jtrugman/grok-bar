/**
 * AI Omnibox — service worker
 *
 * Flow:
 *   Omnibox / context menu
 *     → load settings (preferences only; never prompts)
 *     → routeQuery (provider + buildURL)
 *     → chrome.tabs API
 *
 * Privacy: the extension does not write prompts to chrome.storage or its own
 * logs. Navigating to provider URLs with ?q= still creates normal browser
 * history entries under Chrome's rules (see PRIVACY.md).
 */

import { routeQuery, buildSuggestions, MAX_PROMPT_CHARS } from "./router.js";
import { loadSettings } from "./settings.js";
import { resolveProvider, providerHelpList } from "./providers/index.js";
import { resolveTabAction } from "./navigation.js";

const CONTEXT_MENU_ID = "ai-omnibox-ask";

/** Serialize context-menu rebuilds to avoid removeAll/create races. */
let contextMenuChain = Promise.resolve();

// ---------------------------------------------------------------------------
// Omnibox
// ---------------------------------------------------------------------------

chrome.omnibox.onInputChanged.addListener(async (text, suggest) => {
  try {
    const settings = await loadSettings();
    suggest(buildSuggestions(text, settings.defaultProviderId));
  } catch (err) {
    console.error("AI Omnibox: onInputChanged failed", String(err));
    suggest([]);
  }
});

chrome.omnibox.onInputEntered.addListener(async (text, disposition) => {
  try {
    const settings = await loadSettings();
    const routed = routeQuery(text, settings.defaultProviderId, {
      allowAlias: true,
    });

    if (!routed.ok) {
      if (routed.reason === "too_long") {
        console.warn(
          `AI Omnibox: prompt exceeds ${MAX_PROMPT_CHARS} characters; navigation refused`
        );
        chrome.omnibox.setDefaultSuggestion({
          description: `Prompt too long (max ${MAX_PROMPT_CHARS.toLocaleString()} characters) — not opened`,
        });
      }
      return;
    }

    await openUrl(routed.url, disposition, settings.openInNewTab);
  } catch (err) {
    console.error("AI Omnibox: onInputEntered failed", String(err));
  }
});

chrome.omnibox.onInputStarted.addListener(async () => {
  try {
    const settings = await loadSettings();
    const provider = resolveProvider(settings.defaultProviderId);
    chrome.omnibox.setDefaultSuggestion({
      description: `Ask ${provider.name} (prefix with ${providerHelpList()} to switch)`,
    });
  } catch (err) {
    console.error("AI Omnibox: onInputStarted failed", String(err));
  }
});

// ---------------------------------------------------------------------------
// Context menu (selected text → default provider only; no omnibox aliases)
// ---------------------------------------------------------------------------

async function ensureContextMenu() {
  const run = async () => {
    const settings = await loadSettings();
    await chrome.contextMenus.removeAll();

    if (!settings.contextMenuEnabled) {
      return;
    }

    const provider = resolveProvider(settings.defaultProviderId);
    await chrome.contextMenus.create({
      id: CONTEXT_MENU_ID,
      // Context menu always opens a new foreground tab (ignores openInNewTab),
      // so the user keeps their current page while reading the AI response.
      title: `Ask ${provider.name}: “%s”`,
      contexts: ["selection"],
    });
  };

  contextMenuChain = contextMenuChain.then(run).catch((err) => {
    console.error("AI Omnibox: ensureContextMenu failed", String(err));
  });
  return contextMenuChain;
}

chrome.runtime.onInstalled.addListener(() => {
  void ensureContextMenu();
});

chrome.runtime.onStartup.addListener(() => {
  void ensureContextMenu();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.settings) {
    void ensureContextMenu();
  }
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== CONTEXT_MENU_ID) {
    return;
  }

  try {
    const selection = (info.selectionText ?? "").trim();
    if (!selection) {
      return;
    }

    const settings = await loadSettings();
    // Critical: never apply omnibox provider aliases to free-form selections.
    // Selections like "p values were significant" must stay with the default provider.
    const routed = routeQuery(selection, settings.defaultProviderId, {
      allowAlias: false,
    });

    if (!routed.ok) {
      if (routed.reason === "too_long") {
        console.warn(
          `AI Omnibox: selection exceeds ${MAX_PROMPT_CHARS} characters; navigation refused`
        );
      }
      return;
    }

    // Always new foreground tab so the page the user selected on stays open.
    await openUrl(routed.url, "newForegroundTab", true);
  } catch (err) {
    console.error("AI Omnibox: context menu click failed", String(err));
  }
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
 * @param {chrome.omnibox.OnInputEnteredDisposition | "newForegroundTab" | "newBackgroundTab" | "currentTab"} disposition
 * @param {boolean} preferNewTab
 */
async function openUrl(url, disposition, preferNewTab) {
  const action = resolveTabAction(disposition, preferNewTab);

  try {
    if (action.method === "create") {
      await chrome.tabs.create({ url, active: action.active !== false });
      return;
    }

    try {
      await chrome.tabs.update({ url });
    } catch (updateErr) {
      // No active tab (or update refused): fall back to create.
      console.warn(
        "AI Omnibox: tabs.update failed; falling back to tabs.create",
        String(updateErr)
      );
      await chrome.tabs.create({ url, active: true });
    }
  } catch (err) {
    // Avoid logging err strings that may embed the full URL/prompt.
    console.error("AI Omnibox: failed to open tab", {
      disposition,
      preferNewTab,
      urlLength: url?.length ?? 0,
      errName: err instanceof Error ? err.name : "Error",
      errMessage: sanitizeErrorMessage(err),
    });
  }
}

/**
 * Strip URL-like tokens from error messages before logging.
 * @param {unknown} err
 * @returns {string}
 */
function sanitizeErrorMessage(err) {
  const raw = err instanceof Error ? err.message : String(err);
  return raw.replace(/https?:\/\/\S+/gi, "[url]").slice(0, 200);
}
