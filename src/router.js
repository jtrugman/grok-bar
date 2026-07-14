import {
  PROVIDER_ALIASES,
  listProviderIds,
  providerHelpList,
  resolveProvider,
} from "./providers/index.js";

/**
 * Hard cap on prompt length before navigation.
 * Protects against multi-megabyte context-menu selections and oversized URLs.
 * Fail closed: refuse to navigate rather than silently truncate.
 */
export const MAX_PROMPT_CHARS = 16_000;

/**
 * @typedef {object} RouteOptions
 * @property {boolean} [allowAlias=true] When false, never strip a leading provider token
 *   (required for context-menu selections that may begin with words like "p" or "claude").
 */

/**
 * @typedef {object} RoutedQuery
 * @property {true} ok
 * @property {import("./providers/types.js").Provider} provider
 * @property {string} prompt
 * @property {string} url
 * @property {boolean} usedInlineAlias Whether the first token selected a provider
 */

/**
 * @typedef {object} RouteFailure
 * @property {false} ok
 * @property {"empty" | "too_long"} reason
 * @property {number} [max] Present when reason is "too_long"
 */

/**
 * Parse omnibox (or context-menu) text into a provider + prompt + URL.
 *
 * Rules:
 * - Empty / whitespace-only input is invalid.
 * - Inputs longer than {@link MAX_PROMPT_CHARS} are rejected (fail closed).
 * - When allowAlias is true (omnibox default), a leading token matching a known
 *   alias selects that provider for this query.
 * - Context menus must pass `{ allowAlias: false }` so natural-language
 *   selections are never misrouted.
 * - Prompts are never stored; this function is pure.
 *
 * @param {string} text
 * @param {string} defaultProviderId
 * @param {RouteOptions} [options]
 * @returns {RoutedQuery | RouteFailure}
 */
export function routeQuery(text, defaultProviderId, options = {}) {
  const allowAlias = options.allowAlias !== false;
  const trimmed = (text ?? "").trim();

  if (!trimmed) {
    return { ok: false, reason: "empty" };
  }

  if (trimmed.length > MAX_PROMPT_CHARS) {
    return { ok: false, reason: "too_long", max: MAX_PROMPT_CHARS };
  }

  const tokens = trimmed.split(/\s+/);
  const first = tokens[0].toLowerCase();
  const aliasId = allowAlias ? PROVIDER_ALIASES[first] : undefined;

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
    return { ok: false, reason: "empty" };
  }

  // Re-check after alias stripping (edge: alias + huge remainder).
  if (prompt.length > MAX_PROMPT_CHARS) {
    return { ok: false, reason: "too_long", max: MAX_PROMPT_CHARS };
  }

  return {
    ok: true,
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
  const help = providerHelpList();

  if (!trimmed) {
    return [
      {
        content: " ",
        description: `Type a prompt for ${defaultProvider.name} (or prefix with ${help})`,
      },
    ];
  }

  if (trimmed.length > MAX_PROMPT_CHARS) {
    return [
      {
        content: trimmed.slice(0, 80),
        description: `Prompt too long (max ${MAX_PROMPT_CHARS.toLocaleString()} characters)`,
      },
    ];
  }

  const routed = routeQuery(trimmed, defaultProviderId);
  if (!routed.ok) {
    return [];
  }

  /** @type {chrome.omnibox.SuggestResult[]} */
  const suggestions = [
    {
      content: trimmed,
      description: `Ask ${routed.provider.name}: ${escapeOmnibox(routed.prompt)}`,
    },
  ];

  // When no inline alias was used, offer alternate providers from the registry.
  if (!routed.usedInlineAlias) {
    const alternates = listProviderIds().filter((id) => id !== routed.provider.id);

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
 * Exported for unit tests.
 * @param {string} value
 * @returns {string}
 */
export function escapeOmnibox(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .slice(0, 120);
}
