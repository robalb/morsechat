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

/**
 * Convert a message buffer of alternating sound/silence durations into Morse
 * text. The buffer always starts with a sound segment.
 *
 * With showReadable the decoded letters are translated; otherwise the raw dots
 * and dashes are returned. canTranslateLast controls whether the trailing
 * letter is translated immediately or left pending until the letter gap
 * expires (matching the live preview behaviour).
 */
export function morseBufferToString(
	buffer,
	times,
	{
		showReadable = false,
		translate = (letter) => letter,
		canTranslateLast = false,
	} = {},
) {
	let out = "";
	let down = true;
	let letter = "";
	for (let i = 0; i < buffer.length; i++) {
		const t = buffer[i];
		// released after t millis
		if (down) {
			letter += t < times.dash ? "." : "-";
		}
		// pressed after t millis
		else if (t > times.wordGap) {
			if (showReadable) letter = translate(letter);
			out += letter + (showReadable ? "" : " ") + "  ";
			letter = "";
		} else if (t > times.letterGap) {
			if (showReadable) letter = translate(letter);
			out += letter + (showReadable ? "" : " ");
			letter = "";
		}
		down = !down;
	}
	if (showReadable && canTranslateLast)
		return out + (letter ? translate(letter) : "");
	return out + (showReadable ? " " : "") + letter;
}
