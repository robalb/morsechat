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

import { decodeBuffer, renderLetters, type Letter } from './decode';
import { morseTimes } from './timings';
import { WindowDecoder } from './window';

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

  /**
   * The straight-dynamic decoder (lib/morse/window.ts): it reads the key as it
   * is keyed and works out the speed as it goes, which is why it is fed the
   * elements as they happen rather than run over the buffer afterwards.
   *
   * It is fed in every mode but only read in `straight_dynamic`, which costs
   * nothing and means the estimate is already warm when the mode is switched
   * on. What it produces is mirrored into the `$state` fields below — the
   * decoder itself is a plain object, so that it can be tested outside svelte,
   * and these are what the preview watches.
   */
  #window = new WindowDecoder(100, {
    isCharacter: (code) => Object.hasOwn(getDialect(user.settings.dialect).table, code),
  });
  #letters = $state<Letter[]>([]);
  #pending = $state('');
  #measuredWpm = $state(12);

  /**
   * The dot the next message will start from, and the slider setting it was
   * seeded from.
   *
   * An operator does not change hands between two messages, so what was
   * measured from the last one is a far better prior than the slider, and
   * carrying it over is what keeps the first letter of the second message
   * readable. Moving the slider throws it away: that is the user saying they
   * know better.
   */
  #seedDot: number | null = null;
  #seedWpm = 0;

  /** when the key last changed state, the clock the buffer is measured against */
  #lastTime = 0;

  #paddles: Record<Paddle, boolean> = { dot: false, dash: false };

  #letterTimer: ReturnType<typeof setTimeout> | undefined;
  #idleTick: number | undefined;
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

  /**
   * Whether the key is read at the speed the slider says or at the speed it is
   * actually being keyed at.
   *
   * Only for a straight key: on a paddle the app makes the timing, so there is
   * nothing to measure and the slider is the answer by construction.
   */
  dynamic = $derived(user.settings.key_mode === 'straight_dynamic');

  /** what the preview shows: what has been keyed, read back through the dialect */
  text = $derived.by(() => {
    const dialect = getDialect(user.settings.dialect);
    const showReadable = user.settings.show_readable;
    if (this.dynamic) {
      return renderLetters(this.#letters, this.#pending, { dialect, showReadable });
    }
    return decodeBuffer(this.buffer, {
      wpm: user.settings.wpm,
      dialect,
      showReadable,
      letterComplete: this.#letterComplete,
    });
  });

  /**
   * The speed the message is being read at, for the readout in the preview.
   *
   * In dynamic mode this is the measurement and it moves while you key; in
   * fixed mode it is the slider, and the preview does not show it.
   */
  wpm = $derived(this.dynamic ? this.#measuredWpm : user.settings.wpm);

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

    // A message that is starting takes the speed estimate it inherits — from
    // the message before it, or from the slider if that has moved since. This
    // is here rather than only in `reset()` so that the first message of a page
    // is seeded too, and so that a slider moved between two messages is picked
    // up by the second one.
    if (this.#lastTime === 0) {
      this.#window.reset(this.#seed());
      this.#sync();
    }

    const now = Date.now();
    // the first press of a message starts the clock and records nothing: there
    // is no silence before the beginning of a message
    if (this.#lastTime > 0) {
      const silence = now - this.#lastTime;
      this.buffer.push(silence);
      this.#window.addSilence(silence);
      this.#sync();
    }
    this.#lastTime = now;
    this.keyDown = true;

    // the letter is being added to, so it is not finished, and the message is
    // not finished either
    this.#letterComplete = false;
    clearTimeout(this.#letterTimer);
    this.#stopTicking();
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
      const sound = now - this.#lastTime;
      this.buffer.push(sound);
      this.#lastTime = now;
      // a press cut off at MAX_PRESS is a press nobody meant to key that long,
      // and the search is told about it like any other: one duration out of a
      // window of them, in log space, against a prior that will not let the
      // estimate jump
      this.#window.addSound(sound);
      this.#sync();
    }
    this.keyDown = false;

    clearTimeout(this.#releaseTimer);
    this.tone?.off();

    if (shouldAnnounce && !isTrainingChannel()) {
      getSocket()?.sendTyping(true);
    }

    // The silence that ends a letter is not in the buffer — it ends when the
    // next press arrives, and the point is to read the letter before that. So
    // it is timed here, and the fixed-mode preview re-decodes when it elapses;
    // the dynamic decoder is told about the silence by `#startTicking` instead.
    clearTimeout(this.#letterTimer);
    this.#letterTimer = setTimeout(() => {
      this.#letterComplete = true;
    }, morseTimes(user.settings.wpm).letterGap);

    this.#startTicking();
    this.#scheduleSubmit();
  }

  /* ---------------------------------------------------------------- *
   * The silence
   * ---------------------------------------------------------------- */

  /**
   * Tells the decoder how long the key has been up, once per frame, until it
   * has read everything it is going to.
   *
   * The window decoder has to be *ticked* rather than handed a deadline: what
   * it calls a letter gap is a property of the reading it currently has, that
   * reading changes as the silence grows, and before a gap has been keyed at
   * all its thresholds are `Infinity` — the reading where the class does not
   * occur. This is the same stream lib/playground/engine.svelte.ts feeds it,
   * which is why the preview here reads a hand the way the playground box does.
   */
  #startTicking() {
    this.#stopTicking();
    if (!this.dynamic) return;

    const from = Date.now();
    const tick = () => {
      const elapsed = Date.now() - from;
      this.#window.idle(elapsed);
      // past a word gap of silence no letter is going to arrive to push the
      // window along, so what is in it is as read as it will ever be — and once
      // it is frozen there is nothing left for a tick to change
      const done = elapsed >= this.#window.wordSplit;
      if (done) this.#window.flush();
      this.#sync();
      this.#idleTick = done ? undefined : requestAnimationFrame(tick);
    };
    this.#idleTick = requestAnimationFrame(tick);
  }

  #stopTicking() {
    if (this.#idleTick !== undefined) cancelAnimationFrame(this.#idleTick);
    this.#idleTick = undefined;
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
    this.#stopTicking();
    this.#cancelSubmit();

    // what the message just ended taught us outlives it. A message too short to
    // have taught anything leaves the estimate where it started, so there is
    // nothing to guard against: the search moves its dot by a fraction of the
    // way towards each window it reads, never in one jump.
    this.#seedDot = this.#window.dot;
    this.#window.reset(this.#seed());
    this.#sync();
  }

  /* ---------------------------------------------------------------- *
   * The speed estimate
   * ---------------------------------------------------------------- */

  /** the dot a message starts from, in ms: the last one, or the slider's */
  #seed(): number {
    const wpm = user.settings.wpm;
    // Moving the slider is the one thing that overrules what was measured. It
    // is also how a user gets out of a bad estimate — one message keyed badly
    // enough to poison the next one — without reloading the page.
    if (this.#seedDot === null || this.#seedWpm !== wpm) {
      this.#seedWpm = wpm;
      this.#seedDot = 1200 / wpm;
    }
    return this.#seedDot;
  }

  /**
   * Copies the decoder's output into the reactive fields the preview reads.
   *
   * The decoder is deliberately a plain object — it is the piece worth testing
   * on its own — so this is the one place where what it knows becomes something
   * svelte can see. `letters` is copied rather than aliased because the decoder
   * pushes into its own array in place, which `$state` would not notice.
   */
  #sync() {
    this.#letters = [...this.#window.visible];
    this.#pending = this.#window.preview;
    this.#measuredWpm = Math.round(1200 / this.#window.dot);
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

  #handleKey(e: KeyboardEvent, isDown: boolean) {
    // anti-ch3at measure, as in the react version: a synthetic event has not
    // been keyed by a person
    if (!e.isTrusted) return;
    // held keys repeat, and a repeat is not a new press
    if (e.repeat) return;
    // Not in the react version, and a bug there: the listeners are on the
    // window, so keying happened while typing a password into the login dialog
    // or a callsign into its editor.
    if (isEditable(e.target)) return;

    const keybinds = user.settings.keybinds;
    const key = e.key === ' ' ? 'space' : e.key.toLowerCase();
    const bound = (binding: string) => key === binding.toLowerCase();

    if (bound(keybinds.cancel_message)) {
      if (isDown) this.clear();
      return;
    }

    if (user.settings.key_mode !== 'yambic') {
      // every key that can be a paddle is also the straight key, so switching
      // mode never leaves a hand on a key that does nothing. The space bar is
      // the straight key too, as it has always been.
      if (
        key === 'space' ||
        bound(keybinds.straight) ||
        bound(keybinds.yambic_left) ||
        bound(keybinds.yambic_right)
      ) {
        if (isDown) this.press();
        else this.release();
      }
      return;
    }

    const isLeft = bound(keybinds.yambic_left);
    const isRight = bound(keybinds.yambic_right);
    if (!isLeft && !isRight) return;
    if (isDown) this.press(isLeft);
    else this.release(isLeft);
  }
}

/** whether an event landed in something the user is typing into */
function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

/**
 * The one keyer of the page, the counterpart of the socket in
 * lib/socket/client.ts. There is one key on screen and one message being
 * written, so there is one of these.
 */
export const keyer = new Keyer();
