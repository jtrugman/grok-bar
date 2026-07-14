import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { providers } from "../src/providers/index.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(resolve(root, "manifest.json"), "utf8"));

const errors = [];

if (manifest.manifest_version !== 3) {
  errors.push("manifest_version must be 3");
}

const search = manifest.chrome_settings_overrides?.search_provider;
if (!search?.search_url) {
  errors.push("chrome_settings_overrides.search_provider.search_url is required");
} else if (!String(search.search_url).includes("{searchTerms}")) {
  errors.push("search_url must include {searchTerms}");
} else if (!String(search.search_url).startsWith("https://grok.com/")) {
  errors.push("default search_url should target https://grok.com/");
}
if (search && search.is_default !== true) {
  errors.push("search_provider.is_default should be true for default address-bar search");
}

if (!manifest.omnibox?.keyword) {
  // Optional multi-provider keyword; warn only via absence is fine for now.
}

if (!manifest.background?.service_worker) {
  errors.push("background.service_worker is required");
}

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

if (errors.length) {
  console.error("Validation failed:");
  for (const error of errors) {
    console.error(`  - ${error}`);
  }
  process.exit(1);
}

console.log("OK: manifest + providers look valid");
console.log(`  keyword: ${manifest.omnibox.keyword}`);
console.log(`  providers: ${providers.map((p) => p.id).join(", ")}`);
