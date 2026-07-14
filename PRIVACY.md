# Privacy Policy — Search with Grok

**Last updated:** 2026-07-14

## Summary

**Search with Grok** is a local-only Chrome extension. It opens Grok (and optionally other AI chat sites) with your prompt in the URL. It does **not** collect, store, or transmit prompts to the extension author or any third party controlled by this project.

(Formerly referred to in early drafts as “AI Omnibox.”)

## What data is handled

| Data | Stored by extension? | Where it goes |
| --- | --- | --- |
| Address-bar / selection prompt text | **No** | Passed only into a tab URL for the AI provider (e.g. grok.com) |
| Optional provider preference (context menu / `ai` keyword) | Yes (Chrome `storage.sync`) | Your browser (optionally synced by Chrome to your Google account) |
| Open-in-new-tab preference | Yes | Same as above |
| Context-menu on/off preference | Yes | Same as above |

## What this extension does **not** do

- Does not log full prompts to its own storage
- Does not write prompts to `chrome.storage`, IndexedDB, or local files
- Does not phone home
- Does not include analytics or advertising SDKs
- Does not request host permissions for AI sites (it only navigates tabs)
- Does not inject content scripts into Grok, ChatGPT, Claude, or other AI pages

## Browser history (important)

Opening a provider URL of the form `https://…/?q=<your prompt>` is normal tab navigation. Chrome may record that full URL in **browser history** (and history sync, if you use it). That is Chrome behavior, not extension storage. Clear or control history with Chrome’s usual tools if you do not want prompt text retained there.

Settings schema enforcement drops unknown keys (including any accidental `prompt` field) before writing preferences.

## Third-party sites

When you submit a prompt, Chrome navigates to a third-party AI website (Grok / xAI by default; optionally ChatGPT / OpenAI, Claude / Anthropic, Perplexity, or Gemini / Google via the optional keyword or context menu). Those sites process your prompt under **their** privacy policies and account state (including whether you are signed in). This extension does not control that processing.

## Network access

The extension itself performs no network requests. Only the browser tab you open talks to the AI provider.

## Changes

If this policy changes, the date at the top of this file will be updated.
