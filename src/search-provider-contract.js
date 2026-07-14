/**
 * Single source of truth for the Chrome default-search registration.
 * Manifest JSON must match this shape; validate + e2e assert against it.
 *
 * @typedef {object} SearchProviderContract
 * @property {string} name
 * @property {string} keyword
 * @property {string} search_url
 * @property {string} favicon_url
 * @property {string} encoding
 * @property {true} is_default
 */

/** @type {SearchProviderContract} */
export const GROK_SEARCH_PROVIDER = {
  name: "Grok",
  keyword: "grok",
  search_url: "https://grok.com/?q={searchTerms}",
  favicon_url: "https://grok.com/favicon.ico",
  encoding: "UTF-8",
  is_default: true,
};

/**
 * Fields required by Chrome when prepopulated_id is not used.
 * @type {(keyof SearchProviderContract)[]}
 */
export const REQUIRED_SEARCH_PROVIDER_FIELDS = [
  "name",
  "keyword",
  "search_url",
  "favicon_url",
  "encoding",
  "is_default",
];
