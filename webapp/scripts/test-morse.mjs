/**
 * Unit tests for the Morse timing helpers.
 * Run with: npm test
 */
import { morseBufferToString, wpmToMorseTimes } from "../src/utils/morse.mjs";
import { assert, test } from "./testHarness.mjs";

const table = {
	".": "e",
	"-": "t",
	".-": "a",
	"-.": "n",
	"..": "i",
};
function translate(letter) {
	if (Object.prototype.hasOwnProperty.call(table, letter)) return table[letter];
	return " " + letter + " ";
}

const times = wpmToMorseTimes(12); // dot 100, dash 300, letterGap 300, wordGap 700

test("wpmToMorseTimes uses the standard dot/dash/gap ratios", () => {
	assert.deepEqual(times, {
		dot: 100,
		dash: 300,
		elementGap: 100,
		letterGap: 300,
		wordGap: 700,
	});
});

test("wpmToMorseTimes clamps the supported wpm range", () => {
	assert.equal(wpmToMorseTimes(0).dot, 1200);
	assert.equal(wpmToMorseTimes(-10).dot, 1200);
	assert.equal(wpmToMorseTimes(1).dot, 1200);
	assert.equal(wpmToMorseTimes(200).dot, 6);
	assert.equal(wpmToMorseTimes(201).dot, 6);
	assert.equal(wpmToMorseTimes(1000).dot, 6);
});

test("wpmToMorseTimes rounds the dot length up", () => {
	// 1200 / 17 = 70.58 -> 71
	const slow = wpmToMorseTimes(17);
	assert.equal(slow.dot, 71);
	assert.equal(slow.dash, 213);
	assert.equal(slow.letterGap, 213);
	assert.equal(slow.wordGap, 497);
});

test("a dot is decoded below the dash threshold", () => {
	assert.equal(
		morseBufferToString([100], times, {
			showReadable: true,
			canTranslateLast: true,
			translate,
		}),
		"e",
	);
	assert.equal(
		morseBufferToString([299], times, {
			showReadable: true,
			canTranslateLast: true,
			translate,
		}),
		"e",
	);
});

test("a dash is decoded at and above the dash threshold", () => {
	assert.equal(
		morseBufferToString([300], times, {
			showReadable: true,
			canTranslateLast: true,
			translate,
		}),
		"t",
	);
	assert.equal(
		morseBufferToString([900], times, {
			showReadable: true,
			canTranslateLast: true,
			translate,
		}),
		"t",
	);
});

test("raw mode returns dots and dashes", () => {
	assert.equal(morseBufferToString([100], times), ".");
	assert.equal(morseBufferToString([300], times), "-");
	assert.equal(morseBufferToString([100, 100, 300], times), ".-");
	assert.equal(morseBufferToString([], times), "");
});

test("the last letter stays pending until the letter gap expires", () => {
	assert.equal(
		morseBufferToString([100], times, {
			showReadable: true,
			canTranslateLast: false,
			translate,
		}),
		" .",
	);
	assert.equal(
		morseBufferToString([100], times, {
			showReadable: true,
			canTranslateLast: true,
			translate,
		}),
		"e",
	);
});

test("a letter gap separates letters", () => {
	assert.equal(morseBufferToString([100, 301], times), ". ");
	assert.equal(
		morseBufferToString([100, 301], times, {
			showReadable: true,
			canTranslateLast: true,
			translate,
		}),
		"e",
	);
	assert.equal(
		morseBufferToString([100, 301, 300], times, {
			showReadable: true,
			canTranslateLast: true,
			translate,
		}),
		"et",
	);
});

test("a word gap separates words", () => {
	assert.equal(morseBufferToString([100, 701], times), ".   ");
	assert.equal(
		morseBufferToString([100, 701], times, {
			showReadable: true,
			canTranslateLast: true,
			translate,
		}),
		"e  ",
	);
	assert.equal(
		morseBufferToString([100, 701, 100, 701], times, {
			showReadable: true,
			canTranslateLast: true,
			translate,
		}),
		"e  e  ",
	);
});

test("a short gap does not split a letter", () => {
	assert.equal(
		morseBufferToString([100, 100, 300], times, {
			showReadable: true,
			canTranslateLast: true,
			translate,
		}),
		"a",
	);
});
