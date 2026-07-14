import { grokProvider } from "./grok.js";
import { chatgptProvider } from "./chatgpt.js";
import { claudeProvider } from "./claude.js";
import { perplexityProvider } from "./perplexity.js";
import { geminiProvider } from "./gemini.js";

/** @type {import("./types.js").Provider[]} */
export const providers = [
  grokProvider,
  chatgptProvider,
  claudeProvider,
  perplexityProvider,
  geminiProvider,
];

/** @type {Map<string, import("./types.js").Provider>} */
const byId = new Map(providers.map((p) => [p.id, p]));

/** Default provider when the user has not chosen one. */
export const DEFAULT_PROVIDER_ID = "grok";

/**
 * @param {string} id
 * @returns {import("./types.js").Provider | undefined}
 */
export function getProvider(id) {
  return byId.get(id);
}

/**
 * Resolve a provider id, falling back to the default if unknown.
 * @param {string | undefined | null} id
 * @returns {import("./types.js").Provider}
 */
export function resolveProvider(id) {
  return getProvider(id ?? "") ?? getProvider(DEFAULT_PROVIDER_ID) ?? grokProvider;
}

/**
 * Stable list of registered provider ids (single source of truth for UI lists).
 * @returns {string[]}
 */
export function listProviderIds() {
  return providers.map((p) => p.id);
}

/**
 * Human-readable slash-separated provider id list for omnibox help text.
 * @returns {string}
 */
export function providerHelpList() {
  return listProviderIds().join(" / ");
}

/**
 * Short aliases accepted as a leading token in the omnibox text only.
 * Example: "ai claude explain MCP" → provider=claude, prompt="explain MCP"
 *
 * Single-letter aliases (`g`, `c`, `p`) are intentional for speed; they only
 * apply when followed by more tokens. Context-menu routing never uses these.
 *
 * @type {Record<string, string>}
 */
export const PROVIDER_ALIASES = {
  grok: "grok",
  g: "grok",
  xai: "grok",
  chatgpt: "chatgpt",
  gpt: "chatgpt",
  openai: "chatgpt",
  claude: "claude",
  anthropic: "claude",
  c: "claude",
  perplexity: "perplexity",
  pplx: "perplexity",
  p: "perplexity",
  gemini: "gemini",
  gem: "gemini",
};
