import { createProvider } from "./types.js";

/**
 * Claude (Anthropic) web app.
 *
 * Widely used form:
 *   https://claude.ai/new?q=<prompt>
 *
 * The `/new` path is intentional so existing threads are not modified.
 *
 * @see https://claude.ai
 */
export const claudeProvider = createProvider({
  id: "claude",
  name: "Claude",
  baseUrl: "https://claude.ai/new",
  queryParameter: "q",
  documented: false,
  notes:
    "Uses /new so the prompt opens a fresh conversation rather than appending to an existing one.",
});
