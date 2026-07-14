# Search with Grok

Chrome extension that makes **Grok your default address-bar search**.

Type a question in the Chrome omnibox (the normal Google search bar), press **Enter**, land on Grok. **No keyword.** No `ai` + Space.

**Platform:** default-search override works on **macOS and Windows**. Linux Chrome does not support the same settings-override API.

```text
What is MCP?     →  https://grok.com/?q=What%20is%20MCP%3F
```

**Privacy:** this extension does not store your prompts. Browser history may still record the navigated URL (see `PRIVACY.md`).

---

## Install (first time)

**→ See [INSTALL.md](./INSTALL.md)** for simple step-by-step instructions.

Short version: load this folder as an unpacked extension, then set **Grok** as the default search engine under `chrome://settings/searchEngines`.

---

## How it works

The extension registers a Chrome **search engine**:

```json
"search_url": "https://grok.com/?q={searchTerms}",
"is_default": true
```

Chrome substitutes your address-bar text for `{searchTerms}` and navigates to Grok. That is the same path as adding a custom search engine by hand with `https://grok.com/?q=%s`.

The Grok `?q=` parameter is a **best-effort community** interface (not a documented xAI API). If xAI changes it, update `src/search-provider-contract.js`, keep `manifest.json` in sync, and update `src/providers/grok.js`.

---

## Optional extras

These do **not** replace default search:

| Feature | How |
| --- | --- |
| Right-click selection → Ask Grok | Context menu (toggle in options) |
| Other AIs via keyword | Type `ai` + Space + prompt (or `ai claude …`) |
| Provider for menu / `ai` keyword | Options page |

Default address-bar search is always **Grok** (manifest search provider). Options only change the context menu and the optional `ai` keyword router.

---

## Manual setup without this extension

If you only want Grok search and no extension:

1. `chrome://settings/searchEngines`
2. **Add** search engine:
   - Name: `Grok`
   - Shortcut: `grok` (or anything)
   - URL: `https://grok.com/?q=%s`
3. Make it **default**.

This extension packages that setup, plus optional context menu and multi-provider keyword routing.

---

## Develop / test

```bash
npm install
npx playwright install chromium   # once, for e2e

npm run check        # unit + c8 coverage thresholds + manifest validate
npm run check:full   # check + Playwright extension smoke
```

See **[TESTING.md](./TESTING.md)** for coverage scope, e2e notes, and CI.

No build step. Load the repo root as unpacked.

### Layout

```text
manifest.json            # search_provider → Grok default
src/
  background.js          # optional omnibox keyword + context menu
  router.js
  navigation.js
  settings.js
  providers/             # URL builders (Grok + optional others)
options/
tests/
```

---

## Permissions

| Permission | Why |
| --- | --- |
| `storage` | Optional preferences (context menu, `ai` keyword provider) |
| `contextMenus` | Optional “Ask …” on selection |

No host permissions. No content scripts. No remote code.

`chrome_settings_overrides.search_provider` registers Grok in Chrome’s search-engine list and requests default (user may need to confirm once).

---

## License

[MIT](./LICENSE). Free to use, modify, and distribute.

Not affiliated with xAI.
