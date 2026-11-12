/**
 * Unit tests for the shared keybinding helpers.
 * Run with: npm test
 */
import {
	defaultKeybinds,
	isBindableKey,
	keyLabel,
	keybindLabels,
	keybindLabelsFor,
	mergeKeybinds,
	normalizeKey,
} from "../src/utils/keybinds.mjs";
import { assert, test } from "./testHarness.mjs";

test("default keybindings cover every action", () => {
	assert.deepEqual(defaultKeybinds, {
		straight: "c",
		yambic_left: "z",
		yambic_right: "x",
		cancel_message: "p",
	});
	assert.deepEqual(Object.keys(keybindLabels).sort(), Object.keys(defaultKeybinds).sort());
});

test("normalizeKey lowercases single characters and leaves other keys alone", () => {
	assert.equal(normalizeKey("C"), "c");
	assert.equal(normalizeKey("Z"), "z");
	assert.equal(normalizeKey("1"), "1");
	assert.equal(normalizeKey(" "), " ");
	assert.equal(normalizeKey("F1"), "F1");
	assert.equal(normalizeKey("ArrowUp"), "ArrowUp");
	assert.equal(normalizeKey(""), "");
	assert.equal(normalizeKey(null), "");
	assert.equal(normalizeKey(undefined), "");
	assert.equal(normalizeKey(42), "");
});

test("keyLabel formats printable keys, space and empty values", () => {
	assert.equal(keyLabel("c"), "C");
	assert.equal(keyLabel("z"), "Z");
	assert.equal(keyLabel(" "), "Space");
	assert.equal(keyLabel(""), "unset");
	assert.equal(keyLabel(null), "unset");
	assert.equal(keyLabel("F1"), "F1");
});

test("isBindableKey accepts printable single characters only", () => {
	assert.equal(isBindableKey("c"), true);
	assert.equal(isBindableKey("Z"), true);
	assert.equal(isBindableKey("1"), true);
	assert.equal(isBindableKey("?"), true);
	assert.equal(isBindableKey("é"), true);
	assert.equal(isBindableKey(" "), false);
	assert.equal(isBindableKey("ab"), false);
	assert.equal(isBindableKey("Enter"), false);
	assert.equal(isBindableKey("F1"), false);
	assert.equal(isBindableKey(""), false);
	assert.equal(isBindableKey("\n"), false);
	assert.equal(isBindableKey("\t"), false);
	assert.equal(isBindableKey(String.fromCharCode(127)), false);
	assert.equal(isBindableKey(null), false);
	assert.equal(isBindableKey(7), false);
});

test("mergeKeybinds fills defaults for missing actions", () => {
	assert.deepEqual(mergeKeybinds(undefined), defaultKeybinds);
	assert.deepEqual(mergeKeybinds(null), defaultKeybinds);
	assert.deepEqual(mergeKeybinds({}), defaultKeybinds);
	assert.deepEqual(mergeKeybinds({ straight: "Q" }), {
		...defaultKeybinds,
		straight: "q",
	});
});

test("mergeKeybinds preserves valid custom bindings", () => {
	const merged = mergeKeybinds({
		straight: "a",
		yambic_left: "b",
		yambic_right: "c",
		cancel_message: "d",
	});
	assert.deepEqual(merged, {
		straight: "a",
		yambic_left: "b",
		yambic_right: "c",
		cancel_message: "d",
	});
});

test("mergeKeybinds rejects invalid values and restores the default", () => {
	assert.equal(mergeKeybinds({ straight: "" }).straight, "c");
	assert.equal(mergeKeybinds({ straight: "toolong" }).straight, "c");
	assert.equal(mergeKeybinds({ straight: " " }).straight, "c");
	assert.equal(mergeKeybinds({ straight: 5 }).straight, "c");
	assert.equal(mergeKeybinds({ straight: null }).straight, "c");
	assert.equal(mergeKeybinds({ yambic_left: "  " }).yambic_left, "z");
});

test("mergeKeybinds ignores unknown actions", () => {
	const merged = mergeKeybinds({ unknown: "q", straight: "a" });
	assert.deepEqual(Object.keys(merged).sort(), Object.keys(defaultKeybinds).sort());
	assert.equal(merged.unknown, undefined);
});

test("paddle labels follow the configured paddle order", () => {
	const normal = keybindLabelsFor(true);
	assert.equal(normal.straight, "Straight key");
	assert.equal(normal.yambic_left, "Left key (dit)");
	assert.equal(normal.yambic_right, "Right key (dash)");
	assert.equal(normal.cancel_message, "Cancel message");

	const swapped = keybindLabelsFor(false);
	assert.equal(swapped.yambic_left, "Left key (dash)");
	assert.equal(swapped.yambic_right, "Right key (dit)");
});
