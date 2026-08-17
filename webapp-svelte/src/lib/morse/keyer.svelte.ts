/**
 * The keyer: the one object that knows what is being keyed.
 *
 * In the react app this was spread across four places — the timers and the
 * iambic state machine in components/key/Key.jsx, the buffer in
 * redux/chatSlice.js (`keyDown`/`keyUp`/`resetMessage`), the decode and the
 * submit countdown in components/preview/Preview.jsx, and the send in
 * chatSlice's `send` thunk. None of them could see the others, which is why
 * Key.jsx carries a comment apologising for its own event listeners.
 *
 * Here it is one class with one instance, like the websocket client: the two
 * key buttons call `press()` and `release()`, the preview reads `text` and
 * `progress`, and everything between those is in this file.
 *
 * What it holds is the buffer: alternating key-down and key-up durations in
 * milliseconds, starting with a key-down. That is the message — it is what gets
 * broadcast, what the receiver plays back and what the backend decodes for
 * moderation — and the readable text is only ever a view of it.
 *
 * Reference: webapp/src/components/key/Key.jsx,
 *            webapp/src/components/preview/Preview.jsx,
 *            webapp/src/redux/chatSlice.js
 */
import MorseIambicKeyer from '$lib/morse-pro/morse-pro-keyer-iambic';
import { getSocket, isTrainingChannel, sendMorseMessage } from '$lib/state/chat.svelte';
import { user } from '$lib/state/session.svelte';
import getDialect from '$lib/utils/dialects';

import { decodeBuffer } from './decode';
import { matchAction } from './keybinds';
import { morseTimes } from './timings';

/**
 * How many key releases go by before the channel is told we are typing. The
 * react `keyUp` thunk's `typingGuard`: a stray tap is not worth announcing, a
 * fourth one means a message is on its way.
 */
const TYPING_GUARD = 3;

/**
 * The longest a single press can last, in ms. A key that is somehow never
 * released — a mouseup outside the window, a keyup swallowed by a dialog —
 * would otherwise hold the line down forever and fill the buffer with one
 * enormous dash. The react version's `maxDashTime`.
 */
const MAX_PRESS = 1500;

/**
 * The silence before the submit countdown starts, in ms. Inherited from the
 * react version, where it is commented "completely arbitrary value lol": it is
 * the pause the user is allowed between two letters before the app decides the
 * message is finished.
 */
const SUBMIT_IDLE = 600;

/** what a paddle is, once `left_is_dot` has been applied */
type Paddle = 'dot' | 'dash';

class Keyer {
  /**
   * The message so far: alternating down/up durations in ms, starting with a
   * down. A press in progress is not in here — it is only known how long it
   * lasted once it ends — which is what makes the last entry always a
   * completed element or a completed gap.
   */
  buffer = $state<number[]>([]);

  /** whether the key is down right now, whatever is holding it down */
  keyDown = $state(false);

  /** the submit countdown, 0 to 100, as the preview's progress bar draws it */
  progress = $state(0);

  /**
   * The sidetone. Null until the sound engine lands and assigns it; the keyer
   * calls it on every element boundary and does not care what it does.
   *
   * This is the seam where webapp/src/hooks/UseSound.jsx goes.
   */
  tone: { on: () => void; off: () => void } | null = null;

  /** true once the letter being keyed has been silent long enough to be read */
  #letterComplete = $state(false);

  /** when the key last changed state, the clock the buffer is measured against */
  #lastTime = 0;

  #paddles: Record<Paddle, boolean> = { dot: false, dash: false };

  #letterTimer: ReturnType<typeof setTimeout> | undefined;
  #releaseTimer: ReturnType<typeof setTimeout> | undefined;
  #submitTimer: ReturnType<typeof setTimeout> | undefined;
  #animation: number | undefined;
  #countdownStart = 0;

  /**
   * The iambic state machine, morse-pro's. It asks `keyCallback` which paddles
   * are held whenever it is ready for another element, which is the whole
   * reason it can alternate dits and dahs while both are down.
   *
   * Created once and re-speeded on each press: the wpm is a slider, and a
   * keyer built at the old speed would key the rest of the message at it.
   */
  #iambic = new MorseIambicKeyer({
    keyCallback: () => (this.#paddles.dot ? 1 : 0) | (this.#paddles.dash ? 2 : 0),
    elementStart: () => this.#down(),
    elementEnd: () => this.#up(),
  });

  /** what the preview shows: what has been keyed, read back through the dialect */
  text = $derived.by(() =>
    decodeBuffer(this.buffer, {
      wpm: user.settings.wpm,
      dialect: getDialect(user.settings.dialect),
      showReadable: user.settings.show_readable,
      letterComplete: this.#letterComplete,
    })
  );

  /** nothing has been keyed, so there is nothing to send or to clear */
  empty = $derived(this.buffer.length === 0);

  /* ---------------------------------------------------------------- *
   * The key
   * ---------------------------------------------------------------- */

  /**
   * A paddle went down. In straight mode there is only one key and `isLeft` is
   * ignored; in iambic mode the setting `left_is_dot` decides which of the two
   * paddles this is.
   */
  press(isLeft = true) {
    if (user.settings.key_mode === 'yambic') {
      this.#paddles[this.#paddle(isLeft)] = true;
      this.#iambic.setSpeed(user.settings.wpm);
      // no-op if it is already running, which is what makes a squeeze work:
      // the machine picks the second paddle up by itself at the next element
      this.#iambic.start();
    } else {
      this.#down();
    }
  }

  /** A paddle came up. */
  release(isLeft = true) {
    if (user.settings.key_mode === 'yambic') {
      this.#paddles[this.#paddle(isLeft)] = false;
    } else {
      this.#up();
    }
  }

  /**
   * Lets go of everything.
   *
   * Called when the key component goes away and when the key mode changes
   * under a held paddle: both are ways for a release to never arrive, and a key
   * that is down with nothing on screen holding it is the one state the buffer
   * cannot recover from.
   */
  releaseAll() {
    this.#paddles.dot = false;
    this.#paddles.dash = false;
    this.#iambic.stop();
    this.#up();
  }

  /** which paddle a side is, per the `left_is_dot` setting */
  #paddle(isLeft: boolean): Paddle {
    return isLeft === user.settings.left_is_dot ? 'dot' : 'dash';
  }

  /* ---------------------------------------------------------------- *
   * The buffer
   *
   * Two methods, and every way of keying ends in them: the straight key
   * directly, the iambic machine through its element callbacks. They are
   * the `keyDown` / `keyUp` actions of chatSlice.js, with the clock they
   * kept in the store held here instead.
   * ---------------------------------------------------------------- */

  #down() {
    if (this.keyDown) return;

    const now = Date.now();
    // the first press of a message starts the clock and records nothing: there
    // is no silence before the beginning of a message
    if (this.#lastTime > 0) {
      this.buffer.push(now - this.#lastTime);
    }
    this.#lastTime = now;
    this.keyDown = true;

    // the letter is being added to, so it is not finished, and the message is
    // not finished either
    this.#letterComplete = false;
    clearTimeout(this.#letterTimer);
    this.#cancelSubmit();

    this.tone?.on();

    clearTimeout(this.#releaseTimer);
    this.#releaseTimer = setTimeout(() => this.#up(), MAX_PRESS);
  }

  #up() {
    if (!this.keyDown) return;

    // Read before the push: the guard counts complete presses, and this is the
    // one that is about to be completed.
    const shouldAnnounce = this.buffer.length === TYPING_GUARD * 2;

    const now = Date.now();
    // The clock is only running if this press is part of a message. It is not
    // when the message was thrown away mid-press — the bin button, or the
    // cancel key, while the key is held — and then this release ends nothing:
    // recording it would put the length of the held press against a clock that
    // was reset to zero, and start the next message with a silence.
    if (this.#lastTime > 0) {
      this.buffer.push(now - this.#lastTime);
      this.#lastTime = now;
    }
    this.keyDown = false;

    clearTimeout(this.#releaseTimer);
    this.tone?.off();

    if (shouldAnnounce && !isTrainingChannel()) {
      getSocket()?.sendTyping(true);
    }

    // The silence that ends a letter is not in the buffer — it ends when the
    // next press arrives, and the point is to read the letter before that. So
    // it is timed here, and the preview re-decodes when it elapses.
    clearTimeout(this.#letterTimer);
    this.#letterTimer = setTimeout(() => {
      this.#letterComplete = true;
    }, morseTimes(user.settings.wpm).letterGap);

    this.#scheduleSubmit();
  }

  /* ---------------------------------------------------------------- *
   * Sending
   *
   * The countdown of Preview.jsx: a bar that fills while the key is
   * quiet and sends the message when it is full. `submit_delay` is the
   * milliseconds per percent, so the default 12 is a 1.2 second bar.
   * ---------------------------------------------------------------- */

  #scheduleSubmit() {
    this.#cancelSubmit();
    if (this.empty) return;

    this.#submitTimer = setTimeout(() => {
      this.#countdownStart = Date.now();
      this.#animation = requestAnimationFrame(() => this.#tick());
    }, SUBMIT_IDLE);
  }

  #tick() {
    const elapsed = Date.now() - this.#countdownStart;
    const progress = elapsed / user.settings.submit_delay;
    if (progress < 100) {
      this.progress = progress;
      this.#animation = requestAnimationFrame(() => this.#tick());
      return;
    }
    this.progress = 0;
    void this.#send();
  }

  #cancelSubmit() {
    clearTimeout(this.#submitTimer);
    if (this.#animation !== undefined) cancelAnimationFrame(this.#animation);
    this.#animation = undefined;
    this.progress = 0;
  }

  /**
   * Sends what is in the preview now, instead of waiting the message out: the
   * `transmit` keybinding.
   *
   * The countdown is cancelled first, or the bar would keep filling under a
   * message that has already gone and send the next one early.
   */
  async send() {
    if (this.empty) return;
    this.#cancelSubmit();
    await this.#send();
  }

  async #send() {
    const message = [...this.buffer];
    if (message.length === 0) return;
    // The buffer is cleared before the send, not after it: the user is free to
    // start the next message while this one is in flight, which is what the
    // react thunk did by dispatching resetMessage() first.
    this.reset();
    await sendMorseMessage(message);
  }

  /* ---------------------------------------------------------------- *
   * Clearing
   * ---------------------------------------------------------------- */

  /** Throws the message away without sending it: the preview's bin button. */
  clear() {
    if (this.empty) return;
    this.reset();
    // we are visibly no longer typing, and the message we announced will never
    // arrive to say so
    getSocket()?.sendTyping(false);
  }

  /** Drops the buffer and everything timing it. */
  reset() {
    this.buffer = [];
    this.#lastTime = 0;
    this.#letterComplete = false;
    clearTimeout(this.#letterTimer);
    this.#cancelSubmit();
  }

  /* ---------------------------------------------------------------- *
   * The keyboard
   * ---------------------------------------------------------------- */

  /**
   * Binds the key to the keyboard for as long as the caller wants it.
   *
   * @returns the function that unbinds it, so that a component can call this
   * from an `$effect` and get the cleanup for free.
   */
  listen(): () => void {
    const down = (e: KeyboardEvent) => this.#handleKey(e, true);
    const up = (e: KeyboardEvent) => this.#handleKey(e, false);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      this.releaseAll();
    };
  }

  /**
   * The bindings are read here, on the event, rather than closed over when the
   * listener is registered: an edit in the settings panel is in force at the
   * very next key press, with nothing to re-register. What re-registering *is*
   * for is the key held while its binding is taken away — see Key.svelte.
   */
  #handleKey(e: KeyboardEvent, isDown: boolean) {
    const action = matchAction(e, user.settings.keybinds, {
      mode: user.settings.key_mode,
    });
    if (!action) return;

    switch (action) {
      case 'cancel':
        if (isDown) this.clear();
        return;
      case 'transmit':
        if (isDown) void this.send();
        return;
      case 'straight':
        if (isDown) this.press();
        else this.release();
        return;
      // the paddles, which only match in iambic mode
      default:
        if (isDown) this.press(action === 'left');
        else this.release(action === 'left');
    }
  }
}

/**
 * The one keyer of the page, the counterpart of the socket in
 * lib/socket/client.ts. There is one key on screen and one message being
 * written, so there is one of these.
 */
export const keyer = new Keyer();
