import { createProvider } from "./types.js";

/**
 * Google Gemini web app.
 *
 * Gemini does not officially support a stable `?q=` / `?prompt=` deep link
 * the way ChatGPT/Claude/Grok do. Community workarounds and companion
 * content-script extensions exist (e.g. gemini-url-prompt).
 *
 * We still emit a best-effort URL so the provider slot is usable if Google
 * later honors the parameter, or if the user has a companion extension.
 *
 * @see https://gemini.google.com
 */
export const geminiProvider = createProvider({
  id: "gemini",
  name: "Gemini",
  baseUrl: "https://gemini.google.com/app",
  queryParameter: "q",
  documented: false,
  notes:
    "Best-effort only. Gemini historically ignores URL query prompts without a companion extension or Chrome @gemini site search headers.",
});
