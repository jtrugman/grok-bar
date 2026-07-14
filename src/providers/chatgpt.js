import { createProvider } from "./types.js";

/**
 * ChatGPT (OpenAI) web app.
 *
 * Widely used form:
 *   https://chatgpt.com/?q=<prompt>
 *
 * Optional `hints=search` is used by some extensions for search mode;
 * we omit it by default so the chat surface stays generic.
 *
 * @see https://chatgpt.com
 */
export const chatgptProvider = createProvider({
  id: "chatgpt",
  name: "ChatGPT",
  baseUrl: "https://chatgpt.com/",
  queryParameter: "q",
  documented: false,
  notes:
    "Community-observed URL. Creates a new conversation when signed in.",
});
