/**
 * Runs every webapp test file (scripts/test-*.mjs).
 * Run with: npm test
 */
import { readdir } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { runTests } from "./testHarness.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const files = (await readdir(here))
	.filter((file) => file.startsWith("test-") && file.endsWith(".mjs"))
	.sort();

if (files.length === 0) {
	console.error("No test files found in scripts/");
	process.exit(1);
}

for (const file of files) {
	await import(new URL(file, import.meta.url));
}

runTests();
