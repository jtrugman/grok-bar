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

if (!manifest.omnibox?.keyword) {
  errors.push("omnibox.keyword is required");
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
