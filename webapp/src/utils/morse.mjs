/**
 * Pure Morse timing helpers shared by the keyer preview and the tests.
 */

export function wpmToMorseTimes(wpm) {
	if (wpm < 1) wpm = 1;
	if (wpm > 200) wpm = 200;
	const dotTime = Math.ceil(1200 / wpm);
	return {
		dot: dotTime,
		dash: dotTime * 3,
		elementGap: dotTime,
		letterGap: dotTime * 3,
		wordGap: dotTime * 7,
	};
}

// Adaptive thresholds, expressed as multiples of the local dot length. They sit
// between the nominal Morse ratios so human timing jitter does not flip a dot
// into a dash (or an intra-character gap into a letter gap).
const ADAPTIVE_DOT_RATIO = 2; // between 1 (dot) and 3 (dash)
const ADAPTIVE_LETTER_RATIO = 2; // between 1 (intra gap) and 3 (letter gap)
const ADAPTIVE_WORD_RATIO = 4.5; // between 3 (letter gap) and 7 (word gap)

/**
 * Convert a message buffer of alternating sound/silence durations into Morse
 * text. The buffer always starts with a sound segment.
 *
 * With showReadable the decoded letters are translated; otherwise the raw dots
 * and dashes are returned. canTranslateLast controls whether the trailing
 * letter is translated immediately or left pending until the letter gap
 * expires (matching the live preview behaviour).
 *
 * `unitAt(index)` may return a local dot length for each element. When it does,
 * that element is classified against the local speed instead of the single
 * `times` object. This lets one message contain several keying speeds.
 */
export function morseBufferToString(
	buffer,
	times,
	{
		showReadable = false,
		translate = (letter) => letter,
		canTranslateLast = false,
		unitAt = null,
	} = {},
) {
	let out = "";
	let letter = "";
	for (let i = 0; i < buffer.length; i++) {
		const t = buffer[i];
		// Ignore invalid entries without disturbing the tone/silence parity.
		if (!Number.isFinite(t) || t <= 0) continue;

		const unit = unitAt ? unitAt(i) : null;
		const adaptive = Number.isFinite(unit) && unit > 0;
		const dashThreshold = adaptive ? unit * ADAPTIVE_DOT_RATIO : times.dash;
		const letterGapThreshold = adaptive
			? unit * ADAPTIVE_LETTER_RATIO
			: times.letterGap;
		const wordGapThreshold = adaptive
			? unit * ADAPTIVE_WORD_RATIO
			: times.wordGap;

		// released after t millis
		if (i % 2 === 0) {
			letter += t < dashThreshold ? "." : "-";
		}
		// pressed after t millis
		else if (t > wordGapThreshold) {
			if (showReadable) letter = translate(letter);
			out += letter + (showReadable ? "" : " ") + "  ";
			letter = "";
		} else if (t > letterGapThreshold) {
			if (showReadable) letter = translate(letter);
			out += letter + (showReadable ? "" : " ");
			letter = "";
		}
	}
	if (showReadable && canTranslateLast)
		return out + (letter ? translate(letter) : "");
	return out + (showReadable ? " " : "") + letter;
}
