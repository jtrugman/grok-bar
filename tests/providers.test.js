import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createProvider } from "../src/providers/types.js";
import {
  providers,
  getProvider,
  resolveProvider,
  listProviderIds,
  providerHelpList,
  DEFAULT_PROVIDER_ID,
} from "../src/providers/index.js";
import {
  routeQuery,
  buildSuggestions,
  escapeOmnibox,
  MAX_PROMPT_CHARS,
} from "../src/router.js";

describe("provider registry", () => {
  it("registers expected providers", () => {
    const ids = providers.map((p) => p.id).sort();
    assert.deepEqual(ids, [
      "chatgpt",
      "claude",
      "gemini",
      "grok",
      "perplexity",
    ]);
  });

  it("defaults to grok", () => {
    assert.equal(DEFAULT_PROVIDER_ID, "grok");
    assert.equal(resolveProvider(undefined).id, "grok");
    assert.equal(resolveProvider("nope").id, "grok");
  });

  it("validates https base URLs", () => {
    for (const provider of providers) {
      assert.equal(provider.validateURL(), true, provider.id);
    }
  });

  it("exposes a single source of truth for ids and help text", () => {
    assert.deepEqual(listProviderIds(), providers.map((p) => p.id));
    assert.equal(providerHelpList(), "grok / chatgpt / claude / perplexity / gemini");
  });
});

describe("Grok URL builder", () => {
  const grok = getProvider("grok");

  it("builds the community-observed ?q= form", () => {
    const url = grok.buildURL("Hello");
    assert.equal(url, "https://grok.com/?q=Hello");
  });

  it("URL-encodes spaces", () => {
    const url = grok.buildURL("Explain MCP servers");
    assert.equal(url, "https://grok.com/?q=Explain+MCP+servers");
    const parsed = new URL(url);
    assert.equal(parsed.searchParams.get("q"), "Explain MCP servers");
  });

  it("preserves unicode", () => {
    const prompt = "解释 こんにちは café 🚀";
    const url = grok.buildURL(prompt);
    const parsed = new URL(url);
    assert.equal(parsed.searchParams.get("q"), prompt);
  });

  it("preserves markdown characters", () => {
    const prompt = "# Title\n\n- item **bold** `code`\n\n```js\nconst x = 1;\n```";
    const url = grok.buildURL(prompt);
    const parsed = new URL(url);
    assert.equal(parsed.searchParams.get("q"), prompt);
  });

  it("survives long prompts under the cap (>4k chars)", () => {
    const prompt = "a".repeat(4500) + " 🎯 end";
    assert.ok(prompt.length < MAX_PROMPT_CHARS);
    const url = grok.buildURL(prompt);
    const parsed = new URL(url);
    assert.equal(parsed.searchParams.get("q"), prompt);
    assert.ok(url.length > 4500);
  });

  it("does not append to an existing conversation path", () => {
    const url = grok.buildURL("hi");
    const parsed = new URL(url);
    assert.equal(parsed.pathname, "/");
    assert.ok(!parsed.pathname.includes("/c/"));
    assert.ok(!parsed.pathname.includes("/chat/"));
  });
});

describe("other provider URLs", () => {
  it("ChatGPT uses chatgpt.com/?q=", () => {
    const url = getProvider("chatgpt").buildURL("Hello");
    assert.equal(url, "https://chatgpt.com/?q=Hello");
  });

  it("Claude uses /new so existing chats are not modified", () => {
    const url = getProvider("claude").buildURL("Hello");
    assert.equal(url, "https://claude.ai/new?q=Hello");
  });

  it("Perplexity uses /search?q=", () => {
    const url = getProvider("perplexity").buildURL("Hello");
    assert.equal(url, "https://www.perplexity.ai/search?q=Hello");
  });

  it("Gemini emits best-effort gemini.google.com/app?q=", () => {
    const url = getProvider("gemini").buildURL("Hello");
    assert.equal(url, "https://gemini.google.com/app?q=Hello");
  });
});

describe("createProvider config isolation", () => {
  it("allows a one-line config change to restore compatibility", () => {
    const custom = createProvider({
      id: "custom",
      name: "Custom",
      baseUrl: "https://example.com/chat",
      queryParameter: "prompt",
      extraParams: { mode: "new" },
    });
    const url = custom.buildURL("test query");
    assert.equal(
      url,
      "https://example.com/chat?mode=new&prompt=test+query"
    );
  });

  it("prompt query parameter wins if extraParams reuses the same key", () => {
    const custom = createProvider({
      id: "collide",
      name: "Collide",
      baseUrl: "https://example.com/",
      queryParameter: "q",
      extraParams: { q: "should-not-win" },
    });
    const parsed = new URL(custom.buildURL("real-prompt"));
    assert.equal(parsed.searchParams.get("q"), "real-prompt");
  });
});

describe("routeQuery", () => {
  it("returns empty failure for blank input", () => {
    assert.deepEqual(routeQuery("", "grok"), { ok: false, reason: "empty" });
    assert.deepEqual(routeQuery("   ", "grok"), { ok: false, reason: "empty" });
  });

  it("uses the default provider when no alias is present", () => {
    const routed = routeQuery("Explain MCP", "grok");
    assert.equal(routed.ok, true);
    assert.equal(routed.provider.id, "grok");
    assert.equal(routed.prompt, "Explain MCP");
    assert.equal(routed.usedInlineAlias, false);
    assert.equal(routed.url, "https://grok.com/?q=Explain+MCP");
  });

  it("honors inline provider aliases in omnibox mode", () => {
    const routed = routeQuery("claude Explain MCP", "grok");
    assert.equal(routed.ok, true);
    assert.equal(routed.provider.id, "claude");
    assert.equal(routed.prompt, "Explain MCP");
    assert.equal(routed.usedInlineAlias, true);
    assert.equal(routed.url, "https://claude.ai/new?q=Explain+MCP");
  });

  it("treats a bare alias with no prompt as a normal prompt", () => {
    const routed = routeQuery("claude", "grok");
    assert.equal(routed.ok, true);
    assert.equal(routed.provider.id, "grok");
    assert.equal(routed.prompt, "claude");
  });

  it("supports short aliases (gpt, pplx, g)", () => {
    assert.equal(routeQuery("gpt hello", "grok").provider.id, "chatgpt");
    assert.equal(routeQuery("pplx hello", "grok").provider.id, "perplexity");
    assert.equal(routeQuery("g hello", "chatgpt").provider.id, "grok");
  });

  it("does not apply aliases when allowAlias is false (context menu)", () => {
    const cases = [
      "p values indicate significance",
      "c programming is hard",
      "claude is discussed in chapter 2",
      "gpt models are large",
      "g force was measured",
    ];

    for (const selection of cases) {
      const routed = routeQuery(selection, "grok", { allowAlias: false });
      assert.equal(routed.ok, true, selection);
      assert.equal(routed.provider.id, "grok", selection);
      assert.equal(routed.prompt, selection, selection);
      assert.equal(routed.usedInlineAlias, false, selection);
      assert.match(routed.url, /^https:\/\/grok\.com\/\?q=/);
    }
  });

  it("still allows aliases when allowAlias is true for the same text", () => {
    const routed = routeQuery("p values indicate significance", "grok", {
      allowAlias: true,
    });
    assert.equal(routed.ok, true);
    assert.equal(routed.provider.id, "perplexity");
    assert.equal(routed.prompt, "values indicate significance");
  });

  it("rejects prompts longer than MAX_PROMPT_CHARS (fail closed)", () => {
    const tooLong = "x".repeat(MAX_PROMPT_CHARS + 1);
    const routed = routeQuery(tooLong, "grok");
    assert.deepEqual(routed, {
      ok: false,
      reason: "too_long",
      max: MAX_PROMPT_CHARS,
    });
  });

  it("accepts prompts at exactly MAX_PROMPT_CHARS", () => {
    const exact = "y".repeat(MAX_PROMPT_CHARS);
    const routed = routeQuery(exact, "grok");
    assert.equal(routed.ok, true);
    assert.equal(routed.prompt.length, MAX_PROMPT_CHARS);
  });
});

describe("buildSuggestions + escapeOmnibox", () => {
  it("offers empty-state help derived from the registry", () => {
    const suggestions = buildSuggestions("", "grok");
    assert.equal(suggestions.length, 1);
    assert.match(suggestions[0].description, /Grok/);
    assert.match(suggestions[0].description, /grok \/ chatgpt/);
  });

  it("primary suggestion uses the default provider", () => {
    const suggestions = buildSuggestions("Explain MCP", "grok");
    assert.ok(suggestions.length >= 1);
    assert.equal(suggestions[0].content, "Explain MCP");
    assert.match(suggestions[0].description, /^Ask Grok:/);
  });

  it("offers alternate providers from the registry without hardcoding drift", () => {
    const suggestions = buildSuggestions("Hello", "grok");
    const contents = suggestions.map((s) => s.content);
    assert.ok(contents.includes("chatgpt Hello"));
    assert.ok(contents.includes("claude Hello"));
    assert.ok(contents.includes("perplexity Hello"));
    // Max 1 primary + 3 alternates
    assert.ok(suggestions.length <= 4);
  });

  it("does not offer alternates when an alias was used", () => {
    const suggestions = buildSuggestions("claude Hello", "grok");
    assert.equal(suggestions.length, 1);
    assert.match(suggestions[0].description, /^Ask Claude:/);
  });

  it("surfaces too-long prompts in the dropdown", () => {
    const overlong = "z".repeat(MAX_PROMPT_CHARS + 50);
    const suggestions = buildSuggestions(overlong, "grok");
    assert.equal(suggestions.length, 1);
    assert.match(suggestions[0].description, /too long/i);
  });

  it("keeps overlong suggestion content non-navigable (fail closed)", () => {
    const overlong = "z".repeat(MAX_PROMPT_CHARS + 50);
    const suggestions = buildSuggestions(overlong, "grok");
    // Chrome feeds suggestion.content into onInputEntered; that path must
    // still refuse navigation rather than silently truncate.
    assert.equal(suggestions[0].content, overlong);
    assert.deepEqual(routeQuery(suggestions[0].content, "grok"), {
      ok: false,
      reason: "too_long",
      max: MAX_PROMPT_CHARS,
    });
  });

  it("escapes omnibox XML metacharacters", () => {
    assert.equal(escapeOmnibox("a & b < c > d"), "a &amp; b &lt; c &gt; d");
  });

  it("truncates long omnibox descriptions", () => {
    const out = escapeOmnibox("x".repeat(200));
    assert.equal(out.length, 120);
  });
});
