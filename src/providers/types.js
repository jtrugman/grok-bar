/**
 * @typedef {object} ProviderConfig
 * @property {string} id Stable identifier (e.g. "grok")
 * @property {string} name Human-readable name
 * @property {string} baseUrl Origin + path used to start a new chat
 * @property {string} queryParameter Query string key that carries the prompt
 * @property {Record<string, string>} [extraParams] Optional extra URL params
 * @property {boolean} [documented] Whether the provider documents this URL officially
 * @property {string} [notes] Best-effort / caveats for users
 */

/**
 * @typedef {object} Provider
 * @property {string} id
 * @property {string} name
 * @property {(prompt: string) => string} buildURL
 * @property {() => boolean} validateURL
 * @property {ProviderConfig} config
 */

/**
 * Build a provider from a declarative config.
 * Keeps all URL templates in one place so a provider-side change is a one-line fix.
 *
 * @param {ProviderConfig} config
 * @returns {Provider}
 */
export function createProvider(config) {
  const { baseUrl, queryParameter, extraParams = {} } = config;

  return {
    id: config.id,
    name: config.name,
    config,

    /**
     * @param {string} prompt
     * @returns {string}
     */
    buildURL(prompt) {
      const url = new URL(baseUrl);
      url.searchParams.set(queryParameter, prompt);
      for (const [key, value] of Object.entries(extraParams)) {
        url.searchParams.set(key, value);
      }
      return url.toString();
    },

    /**
     * Sanity-check that the configured base URL is a valid absolute URL.
     * @returns {boolean}
     */
    validateURL() {
      try {
        const url = new URL(baseUrl);
        return url.protocol === "https:";
      } catch {
        return false;
      }
    },
  };
}
