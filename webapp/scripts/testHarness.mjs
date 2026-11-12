/**
 * Tiny test harness shared by the webapp test files.
 *
 * The files under scripts/test-*.mjs register their cases with `test()` and
 * scripts/run-tests.mjs executes them. This keeps `npm test` dependency-free
 * while still running every test file.
 */
import assert from "node:assert/strict";

const tests = [];

export { assert };

export function test(name, fn) {
	tests.push({ name, fn });
}

export function runTests() {
	let failures = 0;
	for (const { name, fn } of tests) {
		try {
			fn();
			console.log(`ok - ${name}`);
		} catch (error) {
			failures += 1;
			console.error(`not ok - ${name}`);
			console.error(error);
		}
	}

	if (failures > 0) {
		console.error(`\n${failures} test(s) failed`);
		process.exit(1);
	}
	console.log(`\n${tests.length} tests passed`);
}
