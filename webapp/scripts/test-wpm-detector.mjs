/**
 * Unit tests for the automatic Morse WPM detector.
 * Run with: npm test
 */
import {
	analyzeLocalWpm,
	detectWpm,
	resolveWpm,
} from "../src/utils/wpmDetector.mjs";
import { morseBufferToString, wpmToMorseTimes } from "../src/utils/morse.mjs";
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

// ---------------------------------------------------------------------------
// Local (per-element) analysis. These tests cover messages whose speed changes
// while they are being keyed, which is the live-preview use case.
// ---------------------------------------------------------------------------

const MORSE_PATTERNS = {
	h: "....",
	e: ".",
	l: ".-..",
	o: "---",
	w: ".--",
	r: ".-.",
	d: "-..",
	t: "-",
	q: "--.-",
	u: "..-",
	i: "..",
	c: "-.-.",
	k: "-.-",
	b: "-...",
	n: "-.",
	f: "..-.",
	x: "-..-",
};
const MORSE_LETTERS = Object.fromEntries(
	Object.entries(MORSE_PATTERNS).map(([letter, pattern]) => [pattern, letter]),
);

function translate(letter) {
	return MORSE_LETTERS[letter] ?? `?${letter}?`;
}

/**
 * Build the alternating tone/gap buffer the keyer produces. Each word may use a
 * different speed, which is how a message changes speed part way through.
 */
function messageBuffer(words, jitter = null) {
	const buffer = [];
	let first = true;
	let sampleIndex = 0;
	const jitterAt = () => (jitter ? jitter[sampleIndex % jitter.length] : 1);

	for (let wordIndex = 0; wordIndex < words.length; wordIndex++) {
		const { text, wpm } = words[wordIndex];
		const unit = 1200 / wpm;
		for (let letterIndex = 0; letterIndex < text.length; letterIndex++) {
			const pattern = MORSE_PATTERNS[text[letterIndex]];
			for (let elementIndex = 0; elementIndex < pattern.length; elementIndex++) {
				if (!first) {
					const gapRatio =
						elementIndex === 0
							? letterIndex === 0 && wordIndex > 0
								? 7
								: 3
							: 1;
					buffer.push(Math.round(unit * gapRatio * jitterAt()));
					sampleIndex += 1;
				}
				buffer.push(
					Math.round(
						unit * (pattern[elementIndex] === "." ? 1 : 3) * jitterAt(),
					),
				);
				sampleIndex += 1;
				first = false;
			}
		}
	}
	return buffer;
}

function decodeAdaptive(buffer, fallbackWpm = 12) {
	const analysis = analyzeLocalWpm(buffer, { fallbackWpm });
	const text = morseBufferToString(buffer, wpmToMorseTimes(fallbackWpm), {
		showReadable: true,
		canTranslateLast: true,
		translate,
		unitAt: (index) => analysis.units[index],
	});
	return { text: text.replace(/\s+/g, " ").trim(), analysis };
}

test("local analysis decodes a message that starts slow then accelerates", () => {
	const buffer = messageBuffer([
		{ text: "hello", wpm: 8 },
		{ text: "world", wpm: 22 },
	]);
	const { text, analysis } = decodeAdaptive(buffer);
	assert.equal(text, "hello world");
	assert.ok(
		analysis.maxWpm - analysis.minWpm >= 10,
		`expected a wide speed range, got ${analysis.minWpm}-${analysis.maxWpm}`,
	);
});

test("local analysis decodes a message that starts fast then slows down", () => {
	const buffer = messageBuffer([
		{ text: "hello", wpm: 24 },
		{ text: "world", wpm: 7 },
	]);
	assert.equal(decodeAdaptive(buffer).text, "hello world");
});

test("local analysis follows gradual speed changes", () => {
	const buffer = messageBuffer([
		{ text: "the", wpm: 7 },
		{ text: "quick", wpm: 10 },
		{ text: "brown", wpm: 14 },
		{ text: "fox", wpm: 20 },
	]);
	assert.equal(decodeAdaptive(buffer).text, "the quick brown fox");
});

test("local analysis tolerates human jitter at mixed speeds", () => {
	const jitter = [0.9, 1.12, 1.06, 0.94, 0.98, 1.15, 0.86, 1.04, 0.92, 1.1];
	const buffer = messageBuffer(
		[
			{ text: "hello", wpm: 8 },
			{ text: "world", wpm: 22 },
		],
		jitter,
	);
	assert.equal(decodeAdaptive(buffer).text, "hello world");
});

test("local analysis keeps working at a constant speed", () => {
	const buffer = messageBuffer([{ text: "thequickbrownfox", wpm: 12 }]);
	assert.equal(decodeAdaptive(buffer).text, "thequickbrownfox");
});

test("local analysis decodes a slow start even when the fallback is faster", () => {
	const buffer = messageBuffer([{ text: "hello", wpm: 5 }]);
	assert.equal(decodeAdaptive(buffer, 12).text, "hello");
});

test("local analysis decodes a fast start even when the fallback is slower", () => {
	const buffer = messageBuffer([{ text: "hello", wpm: 30 }]);
	assert.equal(decodeAdaptive(buffer, 12).text, "hello");
});

test("local analysis handles the full supported speed range", () => {
	const buffer = messageBuffer([
		{ text: "hello", wpm: 5 },
		{ text: "world", wpm: 50 },
	]);
	assert.equal(decodeAdaptive(buffer).text, "hello world");
});

test("local units track a speed change", () => {
	const buffer = messageBuffer([
		{ text: "hello", wpm: 8 },
		{ text: "world", wpm: 22 },
	]);
	const analysis = analyzeLocalWpm(buffer, { fallbackWpm: 12 });
	const firstUnit = analysis.units[0];
	const lastUnit = analysis.units[analysis.units.length - 1];
	assert.ok(Math.abs(firstUnit - 150) < 25, `first unit ${firstUnit}`);
	assert.ok(Math.abs(lastUnit - 1200 / 22) < 15, `last unit ${lastUnit}`);
});

test("analyzeLocalWpm returns one unit per buffer entry", () => {
	const buffer = messageBuffer([{ text: "hello", wpm: 12 }]);
	const analysis = analyzeLocalWpm(buffer, { fallbackWpm: 12 });
	assert.equal(analysis.units.length, buffer.length);
	assert.equal(analysis.detections.length, buffer.length);
	assert.ok(
		analysis.units.every((unit) => Number.isFinite(unit) && unit > 0),
	);
	assert.equal(analysis.minWpm, analysis.maxWpm);
	assert.equal(analysis.currentWpm, analysis.minWpm);
});

test("analyzeLocalWpm uses the configured unit until there is enough data", () => {
	const analysis = analyzeLocalWpm([150], { fallbackWpm: 12 });
	assert.equal(analysis.detections[0], null);
	assert.equal(analysis.units[0], 100); // 1200 / 12
	assert.equal(analysis.currentWpm, 12);
});

test("analyzeLocalWpm handles invalid entries without breaking parity", () => {
	const clean = messageBuffer([{ text: "hello", wpm: 12 }]);
	const withInvalid = [...clean];
	withInvalid[2] = NaN;

	const cleanAnalysis = analyzeLocalWpm(clean, { fallbackWpm: 20 });
	const analysis = analyzeLocalWpm(withInvalid, { fallbackWpm: 20 });

	assert.equal(analysis.units.length, withInvalid.length);
	assert.ok(
		analysis.units.every((unit) => Number.isFinite(unit) && unit > 0),
	);
	// Skipping the invalid entry must not change the estimate for the valid
	// entries or shift the tone/silence parity.
	for (let index = 0; index < withInvalid.length; index++) {
		if (index === 2) continue;
		assert.equal(analysis.units[index], cleanAnalysis.units[index]);
	}
});

test("the decoder ignores invalid trailing entries", () => {
	const buffer = messageBuffer([{ text: "hello", wpm: 12 }]);
	buffer.push(NaN);
	assert.equal(decodeAdaptive(buffer, 20).text, "hello");
});

test("analyzeLocalWpm does not mutate the input buffer", () => {
	const buffer = messageBuffer([
		{ text: "hello", wpm: 8 },
		{ text: "world", wpm: 22 },
	]);
	const copy = [...buffer];
	analyzeLocalWpm(buffer, { fallbackWpm: 12 });
	assert.deepEqual(buffer, copy);
});

test("analyzeLocalWpm handles non-array input", () => {
	for (const value of [null, undefined, "100", 42, {}]) {
		const analysis = analyzeLocalWpm(value, { fallbackWpm: 20 });
		assert.deepEqual(analysis.units, []);
		assert.deepEqual(analysis.detections, []);
		assert.equal(analysis.currentWpm, 20);
	}
});

test("local analysis can decode a growing live buffer", () => {
	const buffer = messageBuffer([
		{ text: "hello", wpm: 8 },
		{ text: "world", wpm: 22 },
	]);
	for (let length = 1; length <= buffer.length; length++) {
		const prefix = buffer.slice(0, length);
		const analysis = analyzeLocalWpm(prefix, { fallbackWpm: 12 });
		assert.equal(analysis.units.length, length);
		const text = morseBufferToString(prefix, wpmToMorseTimes(12), {
			showReadable: true,
			canTranslateLast: true,
			translate,
			unitAt: (index) => analysis.units[index],
		});
		assert.equal(typeof text, "string");
	}
	assert.equal(decodeAdaptive(buffer).text, "hello world");
});
