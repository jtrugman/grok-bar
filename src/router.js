import {
  PROVIDER_ALIASES,
  resolveProvider,
} from "./providers/index.js";

/**
 * @typedef {object} RoutedQuery
 * @property {import("./providers/types.js").Provider} provider
 * @property {string} prompt
 * @property {string} url
 * @property {boolean} usedInlineAlias Whether the first token selected a provider
 */

/**
 * Parse omnibox (or context-menu) text into a provider + prompt + URL.
 *
 * Rules:
 * - Empty / whitespace-only input is invalid (caller should ignore).
 * - Leading token matching a known alias selects that provider for this query.
 * - Otherwise the configured default provider is used.
 * - Prompts are never stored; this function is pure.
 *
 * @param {string} text
 * @param {string} defaultProviderId
 * @returns {RoutedQuery | null}
 */
export function routeQuery(text, defaultProviderId) {
  const trimmed = (text ?? "").trim();
  if (!trimmed) {
    return null;
  }

  const tokens = trimmed.split(/\s+/);
  const first = tokens[0].toLowerCase();
  const aliasId = PROVIDER_ALIASES[first];

  let provider;
  let prompt;
  let usedInlineAlias = false;

  if (aliasId && tokens.length > 1) {
    provider = resolveProvider(aliasId);
    prompt = tokens.slice(1).join(" ");
    usedInlineAlias = true;
  } else {
    provider = resolveProvider(defaultProviderId);
    prompt = trimmed;
  }

  if (!prompt.trim()) {
    return null;
  }

  return {
    provider,
    prompt,
    url: provider.buildURL(prompt),
    usedInlineAlias,
  };
}

/**
 * Build omnibox suggestion descriptions for the current default provider.
 *
 * @param {string} text
 * @param {string} defaultProviderId
 * @returns {chrome.omnibox.SuggestResult[]}
 */
export function buildSuggestions(text, defaultProviderId) {
  const trimmed = (text ?? "").trim();
  const defaultProvider = resolveProvider(defaultProviderId);

  if (!trimmed) {
    return [
      {
        content: " ",
        description: `Type a prompt for ${defaultProvider.name} (or prefix with grok / chatgpt / claude / perplexity / gemini)`,
      },
    ];
  }

  const routed = routeQuery(trimmed, defaultProviderId);
  if (!routed) {
    return [];
  }

  /** @type {chrome.omnibox.SuggestResult[]} */
  const suggestions = [
    {
      content: trimmed,
      description: `Ask ${routed.provider.name}: ${escapeOmnibox(routed.prompt)}`,
    },
  ];

  // When no inline alias was used, offer alternate providers as suggestions.
  if (!routed.usedInlineAlias) {
    const alternates = ["grok", "chatgpt", "claude", "perplexity", "gemini"].filter(
      (id) => id !== routed.provider.id
    );

    for (const id of alternates.slice(0, 3)) {
      const alt = resolveProvider(id);
      suggestions.push({
        content: `${id} ${trimmed}`,
        description: `Ask ${alt.name}: ${escapeOmnibox(trimmed)}`,
      });
    }
  }

  return suggestions;
}

/**
 * Omnibox description XML requires escaping of a few characters.
 * @param {string} value
 * @returns {string}
 */
function escapeOmnibox(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .slice(0, 120);
}
