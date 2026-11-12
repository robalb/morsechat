/**
 * Shared keybinding helpers.
 *
 * Keybindings are stored in the user settings so they are persisted by the
 * backend. Only single printable characters are supported; the backend also
 * validates a length of 1-2 characters for backwards compatibility.
 */

export const defaultKeybinds = {
	straight: "c",
	yambic_left: "z",
	yambic_right: "x",
	cancel_message: "p",
};

export const keybindLabels = {
	straight: "Straight key",
	yambic_left: "Left paddle",
	yambic_right: "Right paddle",
	cancel_message: "Cancel message",
};

/**
 * Labels for the keybinding UI. The paddle labels include the element each
 * paddle currently sends, so the mapping is explicit even when the paddles are
 * swapped.
 */
export function keybindLabelsFor(leftIsDot) {
	return {
		...keybindLabels,
		yambic_left: `Left key (${leftIsDot ? "dit" : "dash"})`,
		yambic_right: `Right key (${leftIsDot ? "dash" : "dit"})`,
	};
}

/**
 * Normalize a keyboard event key for comparisons. Single characters are
 * compared case-insensitively, so Shift+C and c both trigger a "c" binding.
 */
export function normalizeKey(key) {
	if (typeof key !== "string") return "";
	return key.length === 1 ? key.toLowerCase() : key;
}

/**
 * Human readable representation of a bound key.
 */
export function keyLabel(key) {
	if (key === " ") return "Space";
	if (!key) return "unset";
	return key.length === 1 ? key.toUpperCase() : key;
}

/**
 * Whether a keyboard event key can be stored as a binding. Only printable
 * single characters are accepted, which also keeps the backend validation
 * (max 2 characters) satisfied. Space is excluded because it always acts as a
 * straight key.
 */
export function isBindableKey(key) {
	if (typeof key !== "string" || key.length !== 1) return false;
	const code = key.charCodeAt(0);
	if (code < 32 || code === 127) return false;
	return key !== " ";
}

/**
 * Merge stored keybindings with the defaults, discarding invalid values.
 * This keeps older accounts (whose saved settings predate keybindings) and
 * hand-edited settings working.
 */
export function mergeKeybinds(keybinds) {
	const merged = { ...defaultKeybinds, ...(keybinds || {}) };
	const out = {};
	for (const name of Object.keys(defaultKeybinds)) {
		const value = merged[name];
		out[name] =
			typeof value === "string" &&
			value.length >= 1 &&
			value.length <= 2 &&
			value.trim() !== ""
				? normalizeKey(value)
				: defaultKeybinds[name];
	}
	return out;
}
