import { createProvider } from "./types.js";

/**
 * Grok (xAI) web app.
 *
 * URL form is community-observed and best-effort:
 *   https://grok.com/?q=<urlencoded prompt>
 *
 * xAI does not document this as a public developer API. If the parameter
 * changes, update only this file (or the ProviderConfig below).
 *
 * @see https://grok.com
 */
export const grokProvider = createProvider({
  id: "grok",
  name: "Grok",
  baseUrl: "https://grok.com/",
  queryParameter: "q",
  documented: false,
  notes:
    "Best-effort integration. xAI does not document ?q= as a stable API. Logged-in users typically get a new chat; anonymous users may be prompted to sign in first.",
});
