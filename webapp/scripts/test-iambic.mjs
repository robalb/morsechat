/**
 * Unit tests for the iambic keyer state machine.
 * Run with: npm test
 */
import { createIambicKeyer } from "../src/utils/iambicKeyer.mjs";
import { assert, test } from "./testHarness.mjs";

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

test("holding the dash paddle repeats dashes until released", () => {
	const h = makeHarness();
	h.keyer.paddleDown(false);
	h.advance(300);
	h.advance(100);
	h.advance(300);
	h.advance(100);
	h.keyer.paddleUp(false);
	h.advance(300);
	h.advance(100);
	assert.deepEqual(h.summary(), [
		"down:dash@0",
		"up:dash@300",
		"down:dash@400",
		"up:dash@700",
		"down:dash@800",
		"up:dash@1100",
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

test("dash memory inserts a dash during a dot", () => {
	const h = makeHarness();
	h.keyer.paddleDown(true);
	h.advance(20);
	h.keyer.paddleUp(true);
	h.advance(10);
	h.keyer.paddleDown(false);
	h.keyer.paddleUp(false);
	h.advance(70);
	h.advance(100);
	h.advance(300);
	assert.deepEqual(h.summary(), [
		"down:dot@0",
		"up:dot@100",
		"down:dash@200",
		"up:dash@500",
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

test("a dash-first squeeze alternates dash and dot", () => {
	const h = makeHarness();
	h.keyer.paddleDown(false);
	h.advance(50);
	h.keyer.paddleDown(true);
	h.advance(50);
	h.advance(250);
	h.advance(100);
	h.advance(100);
	h.advance(50);
	h.keyer.paddleUp(false);
	h.keyer.paddleUp(true);
	h.advance(300);
	assert.deepEqual(h.summary(), [
		"down:dash@0",
		"up:dash@300",
		"down:dot@400",
		"up:dot@500",
		"down:dash@600",
		"up:dash@900",
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

test("stop during a dash releases the dash immediately", () => {
	const h = makeHarness();
	h.keyer.paddleDown(false);
	h.advance(100);
	h.keyer.stop();
	assert.deepEqual(h.summary(), ["down:dash@0", "up:dash@100"]);
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

test("pressing the same paddle twice does not restart the element", () => {
	const h = makeHarness();
	h.keyer.paddleDown(true);
	h.advance(50);
	h.keyer.paddleDown(true);
	h.advance(50);
	h.keyer.paddleUp(true);
	h.advance(100);
	assert.deepEqual(h.summary(), ["down:dot@0", "up:dot@100"]);
});

test("paddleUp without a matching paddleDown is a no-op", () => {
	const h = makeHarness();
	h.keyer.paddleUp(true);
	h.keyer.paddleUp(false);
	h.advance(500);
	assert.deepEqual(h.summary(), []);
});

test("getState reports the held paddles and the active element", () => {
	const h = makeHarness();
	h.keyer.paddleDown(true);
	assert.deepEqual(h.keyer.getState(), {
		dot: true,
		dash: false,
		dotMemory: false,
		dashMemory: false,
		squeezed: false,
		element: "dot",
		lastElement: "dot",
	});
	h.keyer.paddleDown(false);
	assert.equal(h.keyer.getState().squeezed, true);
	h.keyer.paddleUp(true);
	h.keyer.paddleUp(false);
	assert.equal(h.keyer.getState().dot, false);
	assert.equal(h.keyer.getState().dash, false);
});
