import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { providers } from "../src/providers/index.js";
import {
  GROK_SEARCH_PROVIDER,
  REQUIRED_SEARCH_PROVIDER_FIELDS,
} from "../src/search-provider-contract.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(resolve(root, "manifest.json"), "utf8"));

const errors = [];

if (manifest.manifest_version !== 3) {
  errors.push("manifest_version must be 3");
}

if (!manifest.background?.service_worker) {
  errors.push("background.service_worker is required");
}

const search = manifest.chrome_settings_overrides?.search_provider;
if (!search) {
  errors.push("chrome_settings_overrides.search_provider is required");
} else {
  for (const field of REQUIRED_SEARCH_PROVIDER_FIELDS) {
    if (search[field] === undefined || search[field] === null || search[field] === "") {
      errors.push(`search_provider.${field} is required`);
    }
  }

  for (const [key, expected] of Object.entries(GROK_SEARCH_PROVIDER)) {
    if (search[key] !== expected) {
      errors.push(
        `search_provider.${key} must be ${JSON.stringify(expected)}, got ${JSON.stringify(search[key])}`
      );
    }
  }
}

// Omnibox keyword is optional multi-provider power-user surface.
const omniboxKeyword = manifest.omnibox?.keyword ?? null;

for (const provider of providers) {
  if (!provider.validateURL()) {
    errors.push(`provider ${provider.id} has invalid baseUrl`);
  }
  const sample = provider.buildURL("ping");
  try {
    const url = new URL(sample);
    if (url.protocol !== "https:") {
      errors.push(`provider ${provider.id} did not produce https URL`);
    }
  } catch {
    errors.push(`provider ${provider.id} produced invalid URL: ${sample}`);
  }
}

// Parity: Grok provider URL shape must match default search template semantics.
const grok = providers.find((p) => p.id === "grok");
if (grok) {
  const sample = new URL(grok.buildURL("ping"));
  if (sample.origin + sample.pathname !== "https://grok.com/") {
    errors.push(`grok provider base drifted from https://grok.com/ (${sample.href})`);
  }
  if (!sample.searchParams.has("q")) {
    errors.push("grok provider must use query parameter q");
  }
}

if (errors.length) {
  console.error("Validation failed:");
  for (const error of errors) {
    console.error(`  - ${error}`);
  }
  process.exit(1);
}

console.log("OK: manifest + providers look valid");
console.log(`  default search: ${search.search_url}`);
console.log(`  is_default: ${search.is_default}`);
console.log(`  optional omnibox keyword: ${omniboxKeyword ?? "(none)"}`);
console.log(`  providers: ${providers.map((p) => p.id).join(", ")}`);
