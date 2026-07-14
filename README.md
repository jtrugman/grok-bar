# AI Omnibox

Chrome Manifest V3 extension that sends prompts from the **address bar** (omnibox) to AI chat providers.

Default provider is **Grok**. Also ships with ChatGPT, Claude, Perplexity, and Gemini (best-effort).

```text
ai Explain MCP servers          →  https://grok.com/?q=Explain%20MCP%20servers
ai claude Explain MCP servers   →  https://claude.ai/new?q=Explain%20MCP%20servers
```

**Privacy:** prompts are never stored by the extension. Preferences only.

---

## Research: does this already exist?

### Official from xAI / Grok

**No.** There is no official xAI or Grok Chrome extension that:

- registers an omnibox keyword, or
- documents `https://grok.com/?q=` as a supported developer interface.

xAI documents Grok at [grok.com](https://grok.com) and the API at [docs.x.ai](https://docs.x.ai), but not address-bar deep linking.

### Closest third-party products

| Project | Type | What it does | Gap vs this design |
| --- | --- | --- | --- |
| [Ask Grok (BrowserNative)](https://chromewebstore.google.com/detail/ask-grok/fdphpbffednfcalblpedipcnhnoghhmk) | Chrome Web Store, **not open source** | `@grok` omnibox + context menu → Grok | Grok-only; closed source; not provider-agnostic |
| [multi-search-extension](https://github.com/lawrencecchen/multi-search-extension) | Open source (MIT) | Omnibox `m` opens **multiple** tabs (ChatGPT, Claude, Perplexity, Google, DDG) | Fan-out multi-tab, no Grok, different UX |
| [Grok Everywhere](https://github.com/pablosanzo/grok-everywhere), [Grok-It](https://github.com/rod-trent/Grok-It), API summarizers | Open source | Side panel / context menu / API | Not omnibox URL routing |
| Browser site search | Built into Chrome | Custom search engine with `%s` | No extension packaging, no multi-provider registry |

**Conclusion:** there is no official xAI omnibox product, and no maintained open-source extension that matches this design (provider registry + single-tab deep link + Grok default + zero prompt storage). Building it is justified.

### Grok `?q=` status

Community-observed and working today:

```text
https://grok.com/?q=<URL-encoded prompt>
```

Treat as **best-effort**, not a stable public API. All provider URLs live in `src/providers/*.js` so a single-file edit restores compatibility if a site changes its query parameter.

---

## Install (unpacked)

1. Clone or download this repository.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select this folder (the one containing `manifest.json`).
5. In the address bar, type `ai`, press **Space** or **Tab**, type a prompt, press **Enter**.

Optional: pin the extension and open its options page to change the default provider.

---

## Usage

| Input | Result |
| --- | --- |
| `ai What is MCP?` | Default provider (Grok) with that prompt |
| `ai grok What is MCP?` | Force Grok |
| `ai chatgpt What is MCP?` | ChatGPT |
| `ai claude What is MCP?` | Claude (new chat) |
| `ai perplexity What is MCP?` | Perplexity |
| `ai gemini What is MCP?` | Gemini (best-effort URL) |

Short aliases: `g` / `xai` (Grok), `gpt` / `openai` (ChatGPT), `c` / `anthropic` (Claude), `p` / `pplx` (Perplexity), `gem` (Gemini).

Right-click selected text → **Ask Grok** (or your default provider) if the context menu is enabled in options.

### Login behavior

- **Signed in:** typically a new conversation with the prompt applied.
- **Signed out:** the provider’s login / landing flow; the prompt may or may not survive after login (provider-dependent).

Existing conversations are not targeted. Each navigation uses a “new chat / search” style URL where the provider supports it (e.g. Claude `/new`).

---

## Architecture

```text
Omnibox / context menu
        │
        ▼
   routeQuery()          ← src/router.js
        │
        ▼
    Provider             ← src/providers/*
        │  buildURL(prompt)
        ▼
   Chrome tabs API       ← src/background.js
```

### Provider interface

Each provider implements the same shape via `createProvider(config)`:

```js
{
  id, name,
  buildURL(prompt),   // returns absolute https URL
  validateURL(),      // config sanity check
  config              // baseUrl + queryParameter (+ optional extras)
}
```

Adding a provider is one file under `src/providers/` plus a one-line registration in `src/providers/index.js`.

### Config isolation (maintenance)

If Grok changes `?q=` to something else, edit only `src/providers/grok.js`:

```js
export const grokProvider = createProvider({
  id: "grok",
  name: "Grok",
  baseUrl: "https://grok.com/",
  queryParameter: "q",  // ← change here
});
```

---

## Provider URL map (best-effort)

| Provider | URL template | Documented? |
| --- | --- | --- |
| Grok | `https://grok.com/?q=` | No (community) |
| ChatGPT | `https://chatgpt.com/?q=` | No (community / widely used) |
| Claude | `https://claude.ai/new?q=` | No (community) |
| Perplexity | `https://www.perplexity.ai/search?q=` | No (community) |
| Gemini | `https://gemini.google.com/app?q=` | No; historically ignored without companion tooling |

---

## Acceptance criteria (verified in unit tests)

| Criterion | Status |
| --- | --- |
| `https://grok.com/?q=Hello` form is produced | Covered |
| Unicode survives encode/decode | Covered |
| Markdown survives encode/decode | Covered |
| Long prompts (&gt;4k chars) survive | Covered |
| Existing conversation paths not targeted | Covered (root `/` for Grok, `/new` for Claude) |
| Prompt never stored locally | Design: only preferences in `chrome.storage.sync` |
| Login state respected | Runtime (browser session cookies; extension does not override) |

Manual smoke test after install:

1. Visit `https://grok.com/?q=Hello` while signed in → new Grok conversation.
2. `ai Hello` from the omnibox → same class of URL in a new tab.
3. `ai claude Hello` → Claude new chat URL.

---

## Develop

```bash
# Unit tests (Node 18+, no browser required)
npm test

# Manifest + provider config sanity check
npm run validate
```

No build step. Load the repo root as an unpacked extension. Service worker and options page use native ES modules.

### Layout

```text
manifest.json
src/
  background.js          # omnibox + context menu + tabs
  router.js              # parse aliases, call provider.buildURL
  settings.js            # preferences only (never prompts)
  providers/
    types.js             # createProvider()
    index.js             # registry + aliases
    grok.js
    chatgpt.js
    claude.js
    perplexity.js
    gemini.js
options/                 # default provider + toggles
tests/
icons/
PRIVACY.md
```

---

## Permissions

| Permission | Why |
| --- | --- |
| `storage` | Save default provider and UI toggles |
| `contextMenus` | Optional “Ask …” on selected text |

No host permissions. No content scripts. No remote code.

---

## License

MIT. Not affiliated with xAI, OpenAI, Anthropic, Perplexity, or Google.
