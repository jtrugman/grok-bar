import { createProvider } from "./types.js";

/**
 * Perplexity AI search.
 *
 * Form:
 *   https://www.perplexity.ai/search?q=<prompt>
 *
 * Some multi-search tools use `/search/new`; the stable search path with `q`
 * is sufficient for a new query.
 *
 * @see https://www.perplexity.ai
 */
export const perplexityProvider = createProvider({
  id: "perplexity",
  name: "Perplexity",
  baseUrl: "https://www.perplexity.ai/search",
  queryParameter: "q",
  documented: false,
  notes: "Opens a new Perplexity search with the supplied prompt.",
});
