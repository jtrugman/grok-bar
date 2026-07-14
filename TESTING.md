# Testing

How this extension is tested, what the gates mean, and how to run them.

---

## Quick commands

| Command | What it does |
| --- | --- |
| `npm test` | Unit tests only (Node, no browser) |
| `npm run test:coverage` | Unit tests + **c8** line coverage (fails if pure modules drop below thresholds) |
| `npm run validate` | Manifest + provider URL sanity |
| `npm run test:e2e` | Playwright smoke: load unpacked extension in Chromium |
| `npm run check` | **Default gate:** coverage + validate |
| `npm run check:full` | Coverage + validate + e2e |

Install once:

```bash
npm install
npx playwright install chromium
```

---

## Layers

### 1. Unit tests (`tests/`)

**50 tests** with Node’s built-in test runner (`node:test`).

| File | Focus |
| --- | --- |
| `tests/providers.test.js` | Grok/ChatGPT/Claude/… URLs, routing, aliases, suggestions, 16k fail-closed |
| `tests/settings.test.js` | Allowlist, prompt never stored, storage failure paths |
| `tests/navigation.test.js` | New tab vs current tab policy |
| `tests/search-provider-contract.test.js` | Shared Grok default-search contract vs provider builder |

These cover pure logic only (no real Chrome APIs except a tiny `chrome.storage` mock in settings tests).

### 2. Line coverage (`c8`)

Config: `.c8rc.json`

**Included (must stay green):**

- `src/router.js`
- `src/settings.js`
- `src/navigation.js`
- `src/search-provider-contract.js`
- `src/providers/**`

**Excluded (on purpose):**

- `src/background.js` (Chrome service worker wiring)
- `options/**` (DOM UI)

**Thresholds (gate fails if below):**

| Metric | Minimum |
| --- | --- |
| Lines | 90% |
| Statements | 90% |
| Functions | 90% |
| Branches | 80% |

Current pure-module suite is typically **~98% lines / ~90% branches**.

HTML/LCOV output: `coverage/` after `npm run test:coverage`.

### 3. Manifest validate (`scripts/validate-manifest.js`)

Checks (exact contract from `src/search-provider-contract.js`):

- Manifest V3 shape
- Grok `search_provider` fields equal the shared contract  
  (`search_url` must be exactly `https://grok.com/?q={searchTerms}`, `is_default: true`, plus name/keyword/encoding/favicon_url)
- Grok provider URL builder stays on `https://grok.com/` with query key `q`
- Every registered provider builds a valid HTTPS URL

### 4. Playwright e2e (`e2e/`)

Loads the **unpacked** extension into Playwright’s **Chromium** (not branded Chrome; Chrome removed `--load-extension`).

Asserts:

1. MV3 service worker starts  
2. Options page shows install / default-search guidance  
3. `chrome.runtime.getManifest()` has Grok `search_provider` with `is_default: true`  
4. Icons + background entry resolve  

**Important:** extensions need a **headed** browser. Locally that opens a Chromium window briefly. On GitHub Actions CI we run under `xvfb-run`.

What e2e does **not** prove: that the user’s real Chrome profile accepted Grok as default search (that is a one-time OS/Chrome settings click; see `INSTALL.md`).

---

## CI

`.github/workflows/ci.yml`

| Job | Steps |
| --- | --- |
| `unit` | `npm ci` → `test:coverage` → `validate` → upload `coverage/` |
| `e2e` | `npm ci` → install Chromium → `xvfb-run npm run test:e2e` |

Both run on push/PR to `main` / `master`.

---

## What is intentionally not automated

| Gap | Why |
| --- | --- |
| Full address-bar “type and Enter → Grok tab” in your real Chrome | Requires your profile + accepting default search UI |
| Service worker `chrome.tabs` / context menu at runtime | Needs deeper Chrome API mocks or heavier e2e |
| Pixel UI tests for options CSS | Low value for this surface |

---

## Code review

Adversarial production + quality reviews were run via the agentic quality loop. Local reports (gitignored):

- `CODE_REVIEW.md`
- `CODE_QUALITY_REVIEW.md`

Re-run after large changes if you want a fresh gate.

---

## Adding tests

1. **Pure logic** → unit test in `tests/*.test.js`, keep coverage above thresholds.  
2. **Manifest / search URL** → extend `scripts/validate-manifest.js` and/or e2e manifest assertion.  
3. **Installed extension behavior** → add a case under `e2e/`.  

Prefer testing pure functions extracted from the service worker over mocking every Chrome API.
