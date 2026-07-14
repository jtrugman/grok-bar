/**
 * Build a clean unpacked extension directory for Playwright / packaging.
 * Only ships runtime files (no node_modules, tests, or docs).
 */
import {
  cpSync,
  mkdirSync,
  rmSync,
  writeFileSync,
  readFileSync,
  existsSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(root, ".e2e-extension");

const entries = ["manifest.json", "icons", "src", "options"];

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

for (const entry of entries) {
  const from = resolve(root, entry);
  if (!existsSync(from)) {
    throw new Error(`Missing extension entry: ${entry}`);
  }
  cpSync(from, resolve(outDir, entry), { recursive: true });
}

// Sanity: packed manifest must parse.
const packed = JSON.parse(readFileSync(resolve(outDir, "manifest.json"), "utf8"));
if (packed.manifest_version !== 3) {
  throw new Error("Packed manifest is not MV3");
}

writeFileSync(
  resolve(outDir, ".pack-info.json"),
  JSON.stringify({ packedAt: new Date().toISOString(), root }, null, 2)
);

console.log(`Packed extension → ${outDir}`);
console.log(`  entries: ${entries.join(", ")}`);
