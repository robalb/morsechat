/**
 * Unit tests for the automatic Morse WPM detector.
 * Run with: npm test
 */
import { detectWpm, resolveWpm } from "../src/utils/wpmDetector.mjs";
import { assert, test } from "./testHarness.mjs";

// A representative sequence of Morse element ratios. The buffer starts with a
// tone and alternates tone/silence:
// dot, intra gap, dash, letter gap, dot, word gap, dash, intra gap, dot ...
const RATIOS = [1, 1, 3, 1, 1, 3, 1, 1, 3, 1, 1, 7, 3, 1, 1, 3, 1];

function timingBuffer(wpm, ratios = RATIOS, jitter = null) {
	const unit = 1200 / wpm;
	return ratios.map((ratio, index) => {
		const multiplier = jitter ? jitter[index % jitter.length] : 1;
		return Math.round(unit * ratio * multiplier);
	});
}

function assertWpm(actual, expected, tolerance = 0) {
	assert.ok(actual, "expected a detection result");
	assert.ok(
		Math.abs(actual.wpm - expected) <= tolerance,
		`expected ${expected} WPM (+/- ${tolerance}), got ${actual.wpm}`,
	);
}

test("detects an exact 12 WPM buffer", () => {
	const result = detectWpm(timingBuffer(12), { fallbackWpm: 20 });
	assertWpm(result, 12);
	assert.ok(result.confidence > 0.8, `unexpected confidence ${result.confidence}`);
});

test("detects exact speeds across the supported range", () => {
	for (const wpm of [5, 8, 12, 15, 20, 25, 30, 40, 50]) {
		assertWpm(detectWpm(timingBuffer(wpm), { fallbackWpm: 12 }), wpm);
	}
});

test("detects a jittered human key", () => {
	const jitter = [0.9, 1.12, 1.06, 0.94, 0.98, 1.15, 0.86, 1.04, 0.92, 1.1];
	const result = detectWpm(timingBuffer(15, RATIOS, jitter), { fallbackWpm: 12 });
	assertWpm(result, 15, 1);
});

test("tolerates one long pause without losing the real speed", () => {
	const buffer = timingBuffer(12);
	// Replace a letter gap with a two second thinking pause.
	buffer[5] = 2000;
	const result = detectWpm(buffer, { fallbackWpm: 20 });
	assertWpm(result, 12);
});

test("uses the fallback for an ambiguous all-dot buffer", () => {
	const buffer = [100, 100, 100];
	assert.equal(detectWpm(buffer, { fallbackWpm: 12 }).wpm, 12);
	assert.equal(detectWpm(buffer, { fallbackWpm: 36 }).wpm, 36);
});

test("uses the fallback for an ambiguous all-dash buffer", () => {
	const buffer = [300, 300, 300];
	assert.equal(detectWpm(buffer, { fallbackWpm: 12 }).wpm, 12);
});

test("ambiguous detections have lower confidence than clean ones", () => {
	const ambiguous = detectWpm([100, 100, 100], { fallbackWpm: 12 });
	const clean = detectWpm(timingBuffer(12), { fallbackWpm: 12 });
	assert.ok(ambiguous.confidence <= 0.6, `got ${ambiguous.confidence}`);
	assert.ok(clean.confidence > ambiguous.confidence);
});

test("returns null when there are too few samples", () => {
	assert.equal(detectWpm([100]), null);
	assert.equal(detectWpm([100, 100]), null);
	assert.equal(detectWpm([100, 100, 100, 100], { minSamples: 5 }), null);
});

test("returns null for invalid or empty input", () => {
	assert.equal(detectWpm(null), null);
	assert.equal(detectWpm(undefined), null);
	assert.equal(detectWpm("100"), null);
	assert.equal(detectWpm([]), null);
	assert.equal(detectWpm([0, 0, 0]), null);
	assert.equal(detectWpm([NaN, Infinity, -100]), null);
});

test("ignores invalid entries while preserving tone/silence parity", () => {
	const buffer = timingBuffer(12);
	buffer[2] = NaN;
	const result = detectWpm(buffer, { fallbackWpm: 20 });
	assertWpm(result, 12);
});

test("returns null when no candidate is in the supported speed range", () => {
	// No duration can produce a 5-50 WPM unit.
	assert.equal(detectWpm([10000, 10000, 10000], { fallbackWpm: 12 }), null);
	assert.equal(detectWpm([1, 1, 1], { fallbackWpm: 12 }), null);
});

test("does not mutate the input buffer", () => {
	const buffer = timingBuffer(15);
	const copy = [...buffer];
	detectWpm(buffer, { fallbackWpm: 12 });
	assert.deepEqual(buffer, copy);
});

test("resolveWpm falls back to the configured speed until detection is possible", () => {
	assert.equal(resolveWpm([], 12), 12);
	assert.equal(resolveWpm([100], 20), 20);
	assert.equal(resolveWpm(timingBuffer(20), 12), 20);
});

test("resolveWpm clamps the fallback to the supported range", () => {
	assert.equal(resolveWpm([], 0), 5);
	assert.equal(resolveWpm([], -10), 5);
	assert.equal(resolveWpm([], 200), 50);
});

test("respects custom speed limits", () => {
	const result = detectWpm(timingBuffer(12), { minWpm: 15, maxWpm: 30 });
	assert.ok(result, "expected a detection inside the custom range");
	assert.ok(result.wpm >= 15 && result.wpm <= 30, `got ${result.wpm}`);
	assert.equal(detectWpm(timingBuffer(12), { minWpm: 40, maxWpm: 50 }), null);
});
