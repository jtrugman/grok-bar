/**
 * Discover and run unit tests without shell or Node-version globs.
 *
 * GitHub Actions uses Node 20, which does not expand test globs the way
 * Node 22 does. A pattern like tests slash star-star slash star.test.js is
 * treated as a literal path, so zero tests run and coverage is 0 percent.
 *
 * This script walks tests/ with fs and passes explicit file paths to
 * node --test so discovery is identical on every platform and Node version.
 *
 * When wrapped by c8, we must spawn the same node binary (process.execPath)
 * so coverage instrumentation attaches to the child that actually loads src/.
 */
import { readdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const testsDir = join(root, "tests");

const entries = await readdir(testsDir, { withFileTypes: true });
const files = entries
  .filter((entry) => entry.isFile() && entry.name.endsWith(".test.js"))
  .map((entry) => join(testsDir, entry.name))
  .sort();

if (files.length === 0) {
  console.error(`No .test.js files found in ${testsDir}`);
  process.exit(1);
}

// Prefer process.execArgv flags from c8 (NODE_OPTIONS / inspect wrappers).
const child = spawn(process.execPath, ["--test", ...files], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

child.on("error", (err) => {
  console.error("Failed to spawn test runner:", err);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`Test runner killed by signal ${signal}`);
    process.exit(1);
  }
  process.exit(code ?? 1);
});
