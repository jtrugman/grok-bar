/**
 * Pure tab-open policy (testable without Chrome APIs).
 *
 * @typedef {"create" | "update"} TabMethod
 * @typedef {object} TabAction
 * @property {TabMethod} method
 * @property {boolean} [active] Only for method "create"
 */

/**
 * Resolve how to open a URL given omnibox disposition + user preference.
 *
 * Modifier-key dispositions from Chrome win over the preference.
 * Context menu callers should pass disposition "newForegroundTab".
 *
 * @param {chrome.omnibox.OnInputEnteredDisposition | "newForegroundTab" | "newBackgroundTab" | "currentTab"} disposition
 * @param {boolean} preferNewTab
 * @returns {TabAction}
 */
export function resolveTabAction(disposition, preferNewTab) {
  if (disposition === "newBackgroundTab") {
    return { method: "create", active: false };
  }

  if (disposition === "newForegroundTab") {
    return { method: "create", active: true };
  }

  // disposition === "currentTab" (plain Enter): honor open-in-new-tab setting.
  if (preferNewTab) {
    return { method: "create", active: true };
  }

  return { method: "update" };
}
