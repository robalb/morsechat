/**
 * Iambic paddle keyer state machine (Mode A).
 *
 * The keyer is timing driven and keeps all of its state in a plain object, so
 * it can be unit tested with fake timers. It emits element starts/stops through
 * the onDown/onUp callbacks.
 *
 * Mode A behaviour:
 * - holding both paddles alternates dots and dashes
 * - releasing a squeeze completes the element currently being sent and stops
 * - a paddle pressed during an element is remembered (dot/dash memory)
 */

export const DOT = "dot";
export const DASH = "dash";

export function createIambicKeyer({
	getTimes,
	onDown,
	onUp,
	setTimeoutFn = setTimeout,
	clearTimeoutFn = clearTimeout,
}) {
	const state = {
		dot: false,
		dash: false,
		dotMemory: false,
		dashMemory: false,
		squeezed: false,
		element: null,
		lastElement: null,
	};
	let timer = null;

	function clearTimer() {
		if (timer !== null) {
			clearTimeoutFn(timer);
			timer = null;
		}
	}

	function startElement(element) {
		clearTimer();
		state.element = element;
		state.lastElement = element;
		// The element being sent now consumes any memory for itself. Memory is
		// only useful for an element that has not started yet.
		if (element === DOT) state.dotMemory = false;
		else state.dashMemory = false;

		onDown();
		const times = getTimes();
		const duration = element === DOT ? times.dot : times.dash;
		timer = setTimeoutFn(() => {
			timer = null;
			endElement(element);
		}, duration);
	}

	function endElement(element) {
		// A reset may have happened while this timer was pending.
		if (state.element !== element) return;
		onUp();
		state.element = null;
		const times = getTimes();
		timer = setTimeoutFn(() => {
			timer = null;
			afterGap();
		}, times.elementGap);
	}

	function afterGap() {
		let next = null;
		if (state.dot && state.dash) {
			// Squeeze: alternate elements while both paddles are held.
			next = state.lastElement === DOT ? DASH : DOT;
		} else if (state.dotMemory && state.dashMemory) {
			next = state.lastElement === DOT ? DASH : DOT;
		} else if (state.dotMemory) {
			next = DOT;
		} else if (state.dashMemory) {
			next = DASH;
		} else if (state.dot) {
			next = DOT;
		} else if (state.dash) {
			next = DASH;
		}

		if (next) {
			startElement(next);
		} else {
			state.element = null;
			state.lastElement = null;
		}
	}

	function paddleDown(isDot) {
		if (isDot) {
			if (state.dot) return;
			state.dot = true;
			state.dotMemory = true;
		} else {
			if (state.dash) return;
			state.dash = true;
			state.dashMemory = true;
		}
		if (state.dot && state.dash) state.squeezed = true;

		// Start immediately only when the keyer is completely idle. During an
		// element or gap the memory flags are consumed by afterGap.
		if (state.element === null && timer === null) {
			startElement(state.dot ? DOT : DASH);
		}
	}

	function paddleUp(isDot) {
		if (isDot) {
			if (!state.dot) return;
			state.dot = false;
		} else {
			if (!state.dash) return;
			state.dash = false;
		}
		if (!state.dot && !state.dash) {
			// Iambic mode A: releasing a squeeze completes the element that is
			// currently being sent and then stops. Drop queued memories so no
			// extra element is emitted.
			if (state.squeezed) {
				state.dotMemory = false;
				state.dashMemory = false;
			}
			state.squeezed = false;
		}
	}

	function stop() {
		clearTimer();
		onUp();
		state.dot = false;
		state.dash = false;
		state.dotMemory = false;
		state.dashMemory = false;
		state.squeezed = false;
		state.element = null;
		state.lastElement = null;
	}

	return {
		paddleDown,
		paddleUp,
		stop,
		getState: () => ({ ...state }),
	};
}
