/**
 * An automated morse operator.
 *
 * Turns text into a key schedule and plays it into a page by holding and
 * releasing a real key, at real speed. The events go through CDP, so they are
 * `isTrusted` — which matters: both apps drop synthetic events as an
 * anti-cheat measure, and a driver built on `dispatchEvent` would test nothing.
 *
 * The schedule it produces is the app's own message format: alternating
 * key-down and key-up durations in milliseconds, starting with a key-down.
 * That is what `chat.messageBuffer` held in the react app, what
 * `keyer.buffer` holds in the svelte one, and what the backend decodes.
 */

/** international morse, the subset both apps agree on. Keys are lowercase. */
export const TEXT2MORSE = {
	a: ".-",
	b: "-...",
	c: "-.-.",
	d: "-..",
	e: ".",
	f: "..-.",
	g: "--.",
	h: "....",
	i: "..",
	j: ".---",
	k: "-.-",
	l: ".-..",
	m: "--",
	n: "-.",
	o: "---",
	p: ".--.",
	q: "--.-",
	r: ".-.",
	s: "...",
	t: "-",
	u: "..-",
	v: "...-",
	w: ".--",
	x: "-..-",
	y: "-.--",
	z: "--..",
	1: ".----",
	2: "..---",
	3: "...--",
	4: "....-",
	5: ".....",
	6: "-....",
	7: "--...",
	8: "---..",
	9: "----.",
	0: "-----",
	"?": "..--..",
	"/": "-..-.",
	",": "--..--",
	".": ".-.-.-",
};

/**
 * The durations of a morse element at a given speed.
 *
 * `1200 / wpm` is the dit, which is what webapp/src/redux/userSlice.js,
 * webapp-svelte/src/lib/morse/timings.ts and backend/internal/morse/decode.go
 * all use. Rounded the same way morse-pro rounds it, so the numbers the driver
 * sends are the numbers the app expects to see.
 */
export function morseTimes(wpm) {
	const dot = Math.round(1200 / wpm);
	return {
		dot,
		dash: Math.round(3 * (1200 / wpm)),
		elementGap: dot,
		letterGap: Math.round(3 * (1200 / wpm)),
		wordGap: Math.round(7 * (1200 / wpm)),
	};
}

/** The same times, keyed `slop` slower — see `textToSchedule`. */
export function stretch(times, slop = 0) {
	const scale = 1 + slop;
	return Object.fromEntries(
		Object.entries(times).map(([name, ms]) => [name, Math.round(ms * scale)]),
	);
}

/**
 * Turn text into a key schedule.
 *
 * `slop` is how much longer than textbook everything is keyed, as a fraction.
 * It exists because the react app decodes with strict inequalities against the
 * exact durations — `t > times.letterGap` ends a letter, `t < times.dash` is a
 * dot — so a gap of exactly one letter gap is *not* a letter gap to it, and a
 * message keyed to the millisecond comes out as mush. A person keys nothing
 * exactly, which is why this was never noticed. The svelte port decodes with
 * morse-pro's thresholds, which sit halfway between the two lengths they
 * separate, and reads either.
 *
 * Keying 10% slow is well inside both apps' bands, so it is what the harness
 * does by default; `--slop 0` is the textbook timing that tells them apart.
 *
 * The gap options are how the operator stops being a metronome. Textbook morse
 * puts one dit between two elements of a letter and three between letters, and
 * a machine keys exactly that; a hand does not. The hand has to come back up
 * between elements, and between letters is where the thinking happens, so both
 * run long — and it is precisely those hands that the adaptive decoder exists
 * for. A case that only ever keys 1:3:7 is testing the operator, not the app.
 *
 * @param {string} text  what to key. Lowercased; a space is a word gap.
 * @param {number} wpm   the speed to key it at
 * @param {object} [opts]
 * @param {number} [opts.slop]  fraction to stretch every duration by
 * @param {number} [opts.gap]        gap between elements, in dits (1)
 * @param {number} [opts.letterGap]  gap between letters, in dits (3)
 * @param {number} [opts.wordGap]    gap between words, in dits (7)
 * @returns {number[]}   alternating down/up durations, starting with a down
 */
export function textToSchedule(
	text,
	wpm,
	{ slop = 0, gap = 1, letterGap = 3, wordGap = 7 } = {},
) {
	const t = stretch(morseTimes(wpm), slop);
	// the dit is the unit the shape is expressed in, and it already carries the
	// slop, so the gaps stay in proportion to the elements around them
	t.elementGap = Math.round(t.dot * gap);
	t.letterGap = Math.round(t.dot * letterGap);
	t.wordGap = Math.round(t.dot * wordGap);
	const buffer = [];
	let firstOfWord = true;

	for (const char of text.toLowerCase()) {
		if (char === " ") {
			firstOfWord = true;
			continue;
		}
		const code = TEXT2MORSE[char];
		if (!code) throw new Error(`no morse for "${char}"`);

		for (let i = 0; i < code.length; i++) {
			if (buffer.length > 0) {
				// the gap before this element: inside a letter, between two
				// letters, or between two words
				let gap = t.elementGap;
				if (i === 0) gap = firstOfWord ? t.wordGap : t.letterGap;
				buffer.push(gap);
			}
			buffer.push(code[i] === "." ? t.dot : t.dash);
		}
		firstOfWord = false;
	}
	return buffer;
}

/** Turn a schedule back into dots and dashes, for reporting what was keyed. */
export function scheduleToMorse(buffer, wpm) {
	const t = morseTimes(wpm);
	return buffer
		.map((duration, i) => {
			if (i % 2 === 0) return duration < 2 * t.dot ? "." : "-";
			if (duration < 2 * t.dot) return "";
			if (duration < 5 * t.dot) return " ";
			return "/";
		})
		.join("");
}

async function sleepUntil(when) {
	const delay = when - Date.now();
	if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Play a key schedule into a page.
 *
 * Each press is scheduled against an absolute clock rather than a chain of
 * sleeps, so the millisecond or two that a CDP round trip costs does not
 * accumulate into a drift that would turn the last dots of a long message into
 * dashes.
 *
 * @param {import('puppeteer').Page} page
 * @param {number[]} buffer  alternating down/up durations
 * @param {object} [opts]
 * @param {string} [opts.key]  the keyboard key to hold (the straight key)
 */
export async function playSchedule(page, buffer, { key = "c" } = {}) {
	let target = Date.now();
	for (let i = 0; i < buffer.length; i++) {
		if (i % 2 === 0) {
			await page.keyboard.down(key);
			target += buffer[i];
			await sleepUntil(target);
			await page.keyboard.up(key);
		} else {
			target += buffer[i];
			await sleepUntil(target);
		}
	}
}

/**
 * Key a phrase into a page and leave it there, undecided: the last letter is
 * only translated once the app's own letter-gap timer has run.
 */
export async function keyText(page, text, { wpm = 12, key = "c", ...shape } = {}) {
	const buffer = textToSchedule(text, wpm, shape);
	await playSchedule(page, buffer, { key });
	return buffer;
}

/** How long keying a schedule takes, in ms. */
export function scheduleDuration(buffer) {
	return buffer.reduce((total, duration) => total + duration, 0);
}
