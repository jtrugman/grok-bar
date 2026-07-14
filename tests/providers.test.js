import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createProvider } from "../src/providers/types.js";
import {
  providers,
  getProvider,
  resolveProvider,
  DEFAULT_PROVIDER_ID,
} from "../src/providers/index.js";
import { routeQuery } from "../src/router.js";

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
    // URLSearchParams uses + for spaces; decode should recover the prompt.
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

  it("survives long prompts (>4k chars)", () => {
    const prompt = "a".repeat(4500) + " 🎯 end";
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
      "https://example.com/chat?prompt=test+query&mode=new"
    );
  });
});

describe("routeQuery", () => {
  it("returns null for empty input", () => {
    assert.equal(routeQuery("", "grok"), null);
    assert.equal(routeQuery("   ", "grok"), null);
  });

  it("uses the default provider when no alias is present", () => {
    const routed = routeQuery("Explain MCP", "grok");
    assert.equal(routed.provider.id, "grok");
    assert.equal(routed.prompt, "Explain MCP");
    assert.equal(routed.usedInlineAlias, false);
    assert.equal(routed.url, "https://grok.com/?q=Explain+MCP");
  });

  it("honors inline provider aliases", () => {
    const routed = routeQuery("claude Explain MCP", "grok");
    assert.equal(routed.provider.id, "claude");
    assert.equal(routed.prompt, "Explain MCP");
    assert.equal(routed.usedInlineAlias, true);
    assert.equal(routed.url, "https://claude.ai/new?q=Explain+MCP");
  });

  it("treats a bare alias with no prompt as a normal prompt", () => {
    // "claude" alone is not enough to switch; it becomes the prompt text.
    const routed = routeQuery("claude", "grok");
    assert.equal(routed.provider.id, "grok");
    assert.equal(routed.prompt, "claude");
  });

  it("supports short aliases (gpt, pplx, g)", () => {
    assert.equal(routeQuery("gpt hello", "grok").provider.id, "chatgpt");
    assert.equal(routeQuery("pplx hello", "grok").provider.id, "perplexity");
    assert.equal(routeQuery("g hello", "chatgpt").provider.id, "grok");
  });
});
