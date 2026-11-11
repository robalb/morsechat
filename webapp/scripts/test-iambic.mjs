/**
 * Unit tests for the iambic keyer state machine and keybinding helpers.
 * Run with: npm test
 */
import assert from "node:assert/strict";
import { createIambicKeyer } from "../src/utils/iambicKeyer.mjs";
import {
	isBindableKey,
	keybindLabelsFor,
	mergeKeybinds,
	normalizeKey,
} from "../src/utils/keybinds.mjs";

function makeHarness() {
	let now = 0;
	let nextId = 1;
	let timers = [];
	const events = [];
	let keyer = null;

	function fakeSetTimeout(fn, ms) {
		const id = nextId++;
		timers.push({ id, at: now + ms, fn });
		return id;
	}
	function fakeClearTimeout(id) {
		timers = timers.filter((timer) => timer.id !== id);
	}
	function advance(ms) {
		const target = now + ms;
		for (;;) {
			timers.sort((a, b) => a.at - b.at);
			const timer = timers[0];
			if (!timer || timer.at > target) break;
			timers.shift();
			now = timer.at;
			timer.fn();
		}
		now = target;
	}

	keyer = createIambicKeyer({
		getTimes: () => ({ dot: 100, dash: 300, elementGap: 100 }),
		onDown: () =>
			events.push({
				type: "down",
				element: keyer.getState().element,
				at: now,
			}),
		onUp: () =>
			events.push({
				type: "up",
				element: keyer.getState().element,
				at: now,
			}),
		setTimeoutFn: fakeSetTimeout,
		clearTimeoutFn: fakeClearTimeout,
	});

	return {
		keyer,
		events,
		advance,
		summary: () =>
			events.map((event) => `${event.type}:${event.element}@${event.at}`),
	};
}

const tests = [];
function test(name, fn) {
	tests.push({ name, fn });
}

test("a quick dot tap sends exactly one dot", () => {
	const h = makeHarness();
	h.keyer.paddleDown(true);
	h.keyer.paddleUp(true);
	h.advance(50);
	assert.deepEqual(h.summary(), ["down:dot@0"]);
	h.advance(50);
	assert.deepEqual(h.summary(), ["down:dot@0", "up:dot@100"]);
	h.advance(100);
	assert.deepEqual(h.summary(), ["down:dot@0", "up:dot@100"]);
});

test("a quick dash tap sends exactly one dash", () => {
	const h = makeHarness();
	h.keyer.paddleDown(false);
	h.keyer.paddleUp(false);
	h.advance(300);
	assert.deepEqual(h.summary(), ["down:dash@0", "up:dash@300"]);
	h.advance(100);
	assert.equal(h.events.length, 2);
});

test("holding the dot paddle repeats dots until released", () => {
	const h = makeHarness();
	h.keyer.paddleDown(true);
	h.advance(100);
	h.advance(100);
	h.advance(100);
	h.advance(100);
	assert.deepEqual(h.summary(), [
		"down:dot@0",
		"up:dot@100",
		"down:dot@200",
		"up:dot@300",
		"down:dot@400",
	]);
	h.advance(50);
	h.keyer.paddleUp(true);
	h.advance(50);
	h.advance(100);
	assert.deepEqual(h.summary(), [
		"down:dot@0",
		"up:dot@100",
		"down:dot@200",
		"up:dot@300",
		"down:dot@400",
		"up:dot@500",
	]);
});

test("dot memory inserts a dot during a dash", () => {
	const h = makeHarness();
	h.keyer.paddleDown(false);
	h.advance(50);
	h.keyer.paddleUp(false);
	h.advance(10);
	h.keyer.paddleDown(true);
	h.keyer.paddleUp(true);
	h.advance(240);
	h.advance(100);
	h.advance(100);
	h.advance(100);
	assert.deepEqual(h.summary(), [
		"down:dash@0",
		"up:dash@300",
		"down:dot@400",
		"up:dot@500",
	]);
});

test("mode A stops after the current element when a squeeze is released", () => {
	const h = makeHarness();
	h.keyer.paddleDown(true);
	h.advance(50);
	h.keyer.paddleDown(false);
	h.keyer.paddleUp(true);
	h.keyer.paddleUp(false);
	h.advance(50);
	h.advance(100);
	assert.deepEqual(h.summary(), ["down:dot@0", "up:dot@100"]);
});

test("holding a squeeze alternates dot and dash", () => {
	const h = makeHarness();
	h.keyer.paddleDown(true);
	h.advance(50);
	h.keyer.paddleDown(false);
	h.advance(50);
	h.advance(100);
	h.advance(300);
	h.advance(100);
	h.advance(50);
	h.keyer.paddleUp(true);
	h.keyer.paddleUp(false);
	h.advance(50);
	h.advance(100);
	assert.deepEqual(h.summary(), [
		"down:dot@0",
		"up:dot@100",
		"down:dash@200",
		"up:dash@500",
		"down:dot@600",
		"up:dot@700",
	]);
});

test("releasing one paddle of a squeeze keeps the other paddle running", () => {
	const h = makeHarness();
	h.keyer.paddleDown(true);
	h.advance(50);
	h.keyer.paddleDown(false);
	h.advance(10);
	h.keyer.paddleUp(false);
	h.advance(40);
	h.advance(100);
	h.advance(300);
	h.advance(100);
	h.advance(50);
	h.keyer.paddleUp(true);
	h.advance(50);
	h.advance(100);
	assert.deepEqual(h.summary(), [
		"down:dot@0",
		"up:dot@100",
		"down:dash@200",
		"up:dash@500",
		"down:dot@600",
		"up:dot@700",
	]);
});

test("mode A does not start a queued element when both paddles are released in the gap", () => {
	const h = makeHarness();
	h.keyer.paddleDown(true);
	h.advance(50);
	h.keyer.paddleDown(false);
	h.advance(50);
	h.advance(50);
	h.keyer.paddleUp(true);
	h.keyer.paddleUp(false);
	h.advance(50);
	assert.deepEqual(h.summary(), ["down:dot@0", "up:dot@100"]);
});

test("stop cancels pending timers and releases the key", () => {
	const h = makeHarness();
	h.keyer.paddleDown(true);
	h.advance(50);
	h.keyer.stop();
	assert.deepEqual(h.summary(), ["down:dot@0", "up:dot@50"]);
	h.advance(500);
	assert.equal(h.events.length, 2);
});

test("a second tap after a complete element sends another element", () => {
	const h = makeHarness();
	h.keyer.paddleDown(true);
	h.keyer.paddleUp(true);
	h.advance(200);
	h.keyer.paddleDown(true);
	h.keyer.paddleUp(true);
	h.advance(200);
	assert.deepEqual(h.summary(), [
		"down:dot@0",
		"up:dot@100",
		"down:dot@200",
		"up:dot@300",
	]);
});

test("keybinding helpers normalize and sanitize values", () => {
	assert.equal(normalizeKey("C"), "c");
	assert.equal(normalizeKey(" "), " ");
	assert.equal(normalizeKey("F1"), "F1");
	assert.equal(isBindableKey("c"), true);
	assert.equal(isBindableKey(" "), false);
	assert.equal(isBindableKey("F1"), false);
	assert.equal(isBindableKey("Enter"), false);

	const merged = mergeKeybinds({ straight: "Q" });
	assert.equal(merged.straight, "q");
	assert.equal(merged.yambic_left, "z");
	assert.equal(mergeKeybinds({ straight: "" }).straight, "c");
	assert.equal(mergeKeybinds({ straight: "toolong" }).straight, "c");
	assert.equal(mergeKeybinds({ straight: " " }).straight, "c");

	const normalLabels = keybindLabelsFor(true);
	assert.equal(normalLabels.yambic_left, "Left key (dit)");
	assert.equal(normalLabels.yambic_right, "Right key (dash)");
	const swappedLabels = keybindLabelsFor(false);
	assert.equal(swappedLabels.yambic_left, "Left key (dash)");
	assert.equal(swappedLabels.yambic_right, "Right key (dit)");
});

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
