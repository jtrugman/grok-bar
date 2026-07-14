import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  GROK_SEARCH_PROVIDER,
  REQUIRED_SEARCH_PROVIDER_FIELDS,
} from "../src/search-provider-contract.js";
import { getProvider } from "../src/providers/index.js";

describe("GROK_SEARCH_PROVIDER contract", () => {
  it("exports the exact default-search URL template", () => {
    assert.equal(
      GROK_SEARCH_PROVIDER.search_url,
      "https://grok.com/?q={searchTerms}"
    );
    assert.equal(GROK_SEARCH_PROVIDER.is_default, true);
    assert.equal(GROK_SEARCH_PROVIDER.name, "Grok");
  });

  it("lists all required Chrome fields", () => {
    for (const field of REQUIRED_SEARCH_PROVIDER_FIELDS) {
      assert.notEqual(
        GROK_SEARCH_PROVIDER[field],
        undefined,
        `missing ${field}`
      );
    }
  });

  it("stays aligned with the Grok provider builder", () => {
    const sample = new URL(getProvider("grok").buildURL("hello world"));
    assert.equal(sample.origin, "https://grok.com");
    assert.equal(sample.pathname, "/");
    assert.equal(sample.searchParams.get("q"), "hello world");
    assert.match(GROK_SEARCH_PROVIDER.search_url, /\{searchTerms\}/);
    assert.match(GROK_SEARCH_PROVIDER.search_url, /[?&]q=/);
  });
});
