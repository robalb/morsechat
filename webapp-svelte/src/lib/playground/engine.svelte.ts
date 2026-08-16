/**
 * The playground's engine: one key, many decoders, and a replay.
 *
 * This is to the playground what lib/morse/keyer.svelte.ts is to the chat, and
 * it is deliberately a separate object rather than a mode of that one. The chat
 * keyer is wired to the things a chat needs — the socket, the typing
 * indicator, the submit countdown, the account's settings — and every one of
 * those is a way for a test run to have side effects on a live channel. Nothing
 * here sends anything anywhere.
 *
 * The two differences that matter for the experiment:
 *
 *   - there is more than one decoder, and they are all fed the same stream of
 *     events at the same moments. Anything else and the comparison is between
 *     decoders *and* the timings they happened to receive.
 *   - a recorded message can be replayed through that same path, so a hand
 *     keyed once can be run against an algorithm written a week later. This is
 *     the only reason the corpus is worth collecting.
 *
 * Live keying and replay end in the same two private methods, `#sound` and
 * `#silence`. A decoder cannot tell which it is being fed by, which is the
 * property the whole page rests on.
 */
import { decodeBuffer } from '$lib/morse/decode';
import { matchAction } from '$lib/morse/keybinds';
import { user } from '$lib/state/session.svelte';
import getDialect from '$lib/utils/dialects';

import { ALGORITHMS } from './decoders';
import { SAVED_RECORDINGS } from './recordings';
import type { Decoder, DecodeContext, Recording } from './types';

/**
 * The longest a single press can last, in ms: the chat keyer's `MAX_PRESS`, and
 * here for the same reason — a keyup swallowed by something would otherwise
 * record one press of several minutes.
 */
const MAX_PRESS = 1500;

/**
 * How long the idle ticks keep running after the last release, in ms.
 *
 * Every decoder here has made up its mind about the final letter well inside a
 * second, so this only has to outlast the slowest plausible letter gap. Past it
 * nothing changes and the animation frame is pure cost.
 */
const IDLE_MAX = 4000;

/**
 * The playground is international morse and nothing else. The chat lets the
 * dialect be changed and has to re-render when it is; here it is a constant,
 * because a corpus keyed against several tables is not one corpus.
 */
export const DIALECT = getDialect('international');

/**
 * The one line the sidebar shows for a recording: what the plain fixed decoder
 * makes of it, at the speed it was keyed at.
 *
 * It is there to tell two recordings apart in a list and nothing more. It is
 * emphatically not the ground truth — that is `expected`, and it is typed in by
 * a person — and the whole reason the playground exists is that this line is
 * sometimes wrong.
 */
export function summarise(recording: Recording): string {
  return decodeBuffer(recording.buffer, {
    wpm: recording.wpm,
    dialect: DIALECT,
    showReadable: true,
    letterComplete: true,
  });
}

type Mode = 'idle' | 'recording' | 'playing';

/**
 * One algorithm's box: its decoder, and the reactive view of what that decoder
 * currently says.
 *
 * The decoders are plain objects that mutate in place — that is what lets them
 * be tested and reused outside svelte — so nothing about them is observable on
 * its own. `#version` is the bridge: the engine bumps it after every feed, and
 * the two `$derived`s below re-run. They also re-run when the display settings
 * move, which is why changing "show letters" mid-message redraws all the boxes
 * without re-feeding a thing.
 */
export class Slot {
  readonly id: string;
  readonly name: string;
  readonly description: string;

  readonly decoder: Decoder;
  readonly #ctx: () => DecodeContext;
  #version = $state(0);

  constructor(
    algorithm: (typeof ALGORITHMS)[number],
    ctx: () => DecodeContext
  ) {
    this.id = algorithm.id;
    this.name = algorithm.name;
    this.description = algorithm.description;
    this.decoder = algorithm.create();
    this.#ctx = ctx;
  }

  /** what this algorithm currently reads the message as */
  text = $derived.by(() => {
    this.#version;
    return this.decoder.render(this.#ctx());
  });

  /** the speed it thinks it is reading at, or null when it was told */
  measured = $derived.by(() => {
    this.#version;
    return this.decoder.measuredWpm();
  });

  /** Tells the view that the decoder has been fed. */
  bump() {
    this.#version++;
  }

  /* The shape <Preview /> reads. A box has no countdown and no bin button —
   * nothing here is ever sent — so those two are constants. */
  progress = 0;
  empty = true;
  dynamic = $derived(this.measured !== null);
  wpm = $derived(this.measured ?? 0);
  clear() {}
}

export class Playground {
  /** the wpm slider. The playground's own, not the account's: a test run must
   * not rewrite the settings the user chats with. */
  wpm = $state(12);

  /** letters, or the dots and dashes they were keyed as. Worth having on a
   * page about misreadings: it is the difference between seeing that a letter
   * is wrong and seeing why. */
  showReadable = $state(true);

  keyDown = $state(false);
  mode = $state<Mode>('idle');

  /** the message on screen: what was just keyed, or what is being replayed */
  buffer = $state<number[]>([]);

  /** the recording being replayed, or the last one that was */
  selected = $state<Recording | null>(null);

  /** the corpus, from source. Never changes at runtime — that is the point. */
  readonly saved: Recording[] = SAVED_RECORDINGS;

  /** what has been keyed this session and not yet pasted into recordings.ts */
  fresh = $state<Recording[]>([]);

  /** the JSON of `fresh`, shown only when the clipboard refused it */
  exported = $state('');
  copyStatus = $state('');

  readonly slots: Slot[];

  /** whether `buffer` is a hand-keyed message that has not been saved */
  #dirty = $state(false);

  #lastTime = 0;
  #pressTimer: ReturnType<typeof setTimeout> | undefined;
  #playTimer: ReturnType<typeof setTimeout> | undefined;
  #frame: number | undefined;

  /** where the replay is in the recording, and the clock it keeps to */
  #playIndex = 0;
  #playClock = 0;
  #playStart = 0;

  constructor() {
    const ctx = () => this.context;
    this.slots = ALGORITHMS.map((algorithm) => new Slot(algorithm, ctx));
  }

  get context(): DecodeContext {
    return { wpm: this.wpm, dialect: DIALECT, showReadable: this.showReadable };
  }

  /** whether there is a message on screen at all */
  empty = $derived(this.buffer.length === 0);

  /** whether the message on screen is worth adding to the corpus */
  canSave = $derived(this.#dirty && this.buffer.length > 0);

  /** whether there is something to replay */
  canReplay = $derived(this.buffer.length > 0);

  /* ---------------------------------------------------------------- *
   * The key
   * ---------------------------------------------------------------- */

  /**
   * A press. Starting to key at any other moment is taken as starting a new
   * recording, which is the only reading that makes sense: the boxes are
   * showing a replay or a finished message, and the operator has begun keying
   * a different one over the top of it.
   */
  press() {
    if (this.mode !== 'recording') this.record();
    this.#down();
  }

  /**
   * A release. Only a press that this object started counts: a replay holds the
   * key down too, and a stray keyup arriving during one — a key released after
   * the tab was focused, say — would otherwise be recorded as a press lasting
   * however long the replay had been running.
   */
  release() {
    if (this.mode !== 'recording') return;
    this.#up();
  }

  /* ---------------------------------------------------------------- *
   * The event stream
   *
   * Live keying measures the durations off the clock; replay knows them
   * exactly. Below this line the two are indistinguishable.
   * ---------------------------------------------------------------- */

  #down() {
    if (this.keyDown) return;
    const now = Date.now();
    // the first press of a message records no silence: there is none before
    // the beginning of a message
    if (this.#lastTime > 0) this.#silence(now - this.#lastTime);
    this.#lastTime = now;
    this.keyDown = true;
    this.#stopIdle();

    clearTimeout(this.#pressTimer);
    this.#pressTimer = setTimeout(() => this.#up(), MAX_PRESS);
  }

  #up() {
    if (!this.keyDown) return;
    const now = Date.now();
    this.#sound(now - this.#lastTime);
    this.#lastTime = now;
    this.keyDown = false;
    clearTimeout(this.#pressTimer);
    this.#startIdle();
  }

  /** A press ended, having lasted `ms`. */
  #sound(ms: number) {
    if (this.mode === 'recording') this.buffer.push(ms);
    for (const slot of this.slots) {
      slot.decoder.addSound(ms);
      slot.bump();
    }
  }

  /** A silence ended, having lasted `ms`. */
  #silence(ms: number) {
    if (this.mode === 'recording') this.buffer.push(ms);
    for (const slot of this.slots) {
      slot.decoder.addSilence(ms);
      slot.bump();
    }
  }

  /**
   * The tick that runs while the key is up.
   *
   * Without it the last letter of every message would sit on screen as raw dots
   * and dashes until the operator keyed something else: the silence that ends
   * it has no length until the next press arrives. An animation frame rather
   * than a timer because it is a redraw and nothing else, and because it stops
   * by itself when the tab is hidden.
   */
  #startIdle() {
    this.#stopIdle();
    const from = this.#lastTime;
    const tick = () => {
      const elapsed = Date.now() - from;
      for (const slot of this.slots) {
        slot.decoder.idle(elapsed);
        slot.bump();
      }
      if (elapsed < IDLE_MAX) this.#frame = requestAnimationFrame(tick);
      else this.#frame = undefined;
    };
    this.#frame = requestAnimationFrame(tick);
  }

  #stopIdle() {
    if (this.#frame !== undefined) cancelAnimationFrame(this.#frame);
    this.#frame = undefined;
  }

  /* ---------------------------------------------------------------- *
   * Recording
   * ---------------------------------------------------------------- */

  /** Clears everything and waits to be keyed at: the "record new" button. */
  record() {
    this.#stop();
    this.#resetDecoders();
    this.buffer = [];
    this.selected = null;
    this.#dirty = true;
    this.mode = 'recording';
  }

  /** Throws the message away: the bin button. */
  clear() {
    this.#stop();
    this.#resetDecoders();
    this.buffer = [];
    this.selected = null;
    this.#dirty = false;
    this.mode = 'idle';
  }

  /**
   * Adds the message on screen to the session's recordings.
   *
   * It goes in with an empty `expected`, which is the honest state of it: the
   * operator knows what they keyed, and until they type it into the sidebar the
   * recording is a replayable curiosity rather than a test case.
   */
  save() {
    if (!this.canSave) return;
    this.fresh.push({
      id: newId(),
      buffer: [...$state.snapshot(this.buffer)],
      wpm: this.wpm,
      expected: '',
      created: new Date().toISOString(),
    });
    this.#dirty = false;
    this.mode = 'idle';
  }

  /** The hand-typed ground truth for a recording of this session. */
  setExpected(id: string, expected: string) {
    const rec = this.fresh.find((r) => r.id === id);
    if (rec) rec.expected = expected;
  }

  /** Drops one of this session's recordings — a mis-keyed one, before export. */
  discard(id: string) {
    this.fresh = this.fresh.filter((r) => r.id !== id);
    if (this.selected?.id === id) this.selected = null;
  }

  /**
   * Puts this session's recordings on the clipboard, for pasting into
   * lib/playground/recordings.ts.
   *
   * The clipboard can be refused — it needs a secure context and a gesture, and
   * a refusal here would otherwise look exactly like a successful copy of
   * nothing — so a refusal falls back to showing the JSON to be selected by
   * hand.
   */
  async copyFresh() {
    const json = JSON.stringify($state.snapshot(this.fresh), null, 2);
    const count = this.fresh.length;
    try {
      await navigator.clipboard.writeText(json);
      this.exported = '';
      this.copyStatus = `${count} recording${count === 1 ? '' : 's'} copied`;
    } catch {
      this.exported = json;
      this.copyStatus = 'the clipboard refused — copy it from below';
    }
  }

  /* ---------------------------------------------------------------- *
   * Playback
   * ---------------------------------------------------------------- */

  /**
   * Replays a recording as if it were being keyed now.
   *
   * The slider is set to the speed the recording was made at, because the fixed
   * decoder reads the slider: replaying against whatever the slider happens to
   * say would compare the algorithms against each other under a condition none
   * of them was recorded with.
   */
  play(recording: Recording) {
    this.#stop();
    this.#resetDecoders();
    this.wpm = recording.wpm;
    this.buffer = [...recording.buffer];
    this.selected = recording;
    this.#dirty = false;
    this.mode = 'playing';

    this.#playIndex = 0;
    this.#playClock = 0;
    this.#playStart = Date.now();
    this.#lastTime = 0;
    this.#step();
  }

  /**
   * Plays the message on screen again from the beginning — a saved one or one
   * just keyed, whichever is there.
   */
  restart() {
    if (this.buffer.length === 0) return;
    this.play(
      this.selected ?? {
        id: 'current',
        buffer: [...$state.snapshot(this.buffer)],
        wpm: this.wpm,
        expected: '',
        created: '',
      }
    );
  }

  /**
   * One event of the replay.
   *
   * The delay is computed against an absolute clock rather than from the last
   * timer, because `setTimeout` rounds up and a chain of two hundred of them
   * would drift the message slower than it was keyed — which, on a page about
   * speed estimation, would be measuring the browser rather than the algorithm.
   */
  #step() {
    if (this.mode !== 'playing') return;
    const buffer = this.selected?.buffer ?? [];
    const i = this.#playIndex;
    if (i >= buffer.length) {
      // The message stays on screen exactly as it ended: nothing is cleared
      // until something new is started. Comparing boxes is the point, and a
      // comparison you have to catch mid-flight is no use.
      this.mode = 'idle';
      if (this.keyDown) {
        this.keyDown = false;
        this.#lastTime = Date.now();
        this.#startIdle();
      }
      return;
    }

    const ms = buffer[i];
    this.#playClock += ms;
    const delay = Math.max(0, this.#playClock - (Date.now() - this.#playStart));

    if (i % 2 === 0) {
      // a press: it starts now and ends after `ms`
      this.keyDown = true;
      this.#stopIdle();
      this.#playTimer = setTimeout(() => {
        this.keyDown = false;
        this.#lastTime = Date.now();
        this.#sound(ms);
        this.#playIndex = i + 1;
        this.#startIdle();
        this.#step();
      }, delay);
    } else {
      // a silence: it ends when the next press arrives
      this.#playTimer = setTimeout(() => {
        this.#stopIdle();
        this.#silence(ms);
        this.#playIndex = i + 1;
        this.#step();
      }, delay);
    }
  }

  /* ---------------------------------------------------------------- *
   * Housekeeping
   * ---------------------------------------------------------------- */

  #stop() {
    clearTimeout(this.#playTimer);
    clearTimeout(this.#pressTimer);
    this.#stopIdle();
    this.keyDown = false;
    this.#lastTime = 0;
    this.mode = 'idle';
  }

  #resetDecoders() {
    for (const slot of this.slots) {
      slot.decoder.reset(this.context);
      slot.bump();
    }
  }

  /* ---------------------------------------------------------------- *
   * The keyboard
   *
   * The same contract as the chat keyer's `listen()`, so <Key /> can drive
   * either of them: bind on mount, and return the unbind.
   * ---------------------------------------------------------------- */

  listen(): () => void {
    const down = (e: KeyboardEvent) => this.#handleKey(e, true);
    const up = (e: KeyboardEvent) => this.#handleKey(e, false);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      this.release();
    };
  }

  #handleKey(e: KeyboardEvent, isDown: boolean) {
    // The chat's bindings and the chat's guards — including the one that keeps
    // a key out of the text inputs in the sidebar, where naming a recording
    // would otherwise key it. The mode is this box's own rather than the
    // setting: there is one key here and no paddles, and it should not go dead
    // because the chat was left in iambic. `transmit` is the one action with
    // nothing to do here, and matches nothing below.
    const action = matchAction(e, user.settings.keybinds, { mode: 'straight' });

    if (action === 'cancel') {
      if (isDown) this.clear();
      return;
    }

    if (action === 'straight') {
      e.preventDefault();
      if (isDown) this.press();
      else this.release();
    }
  }
}

/** short enough to read in a diff, unique enough for a session's worth */
function newId(): string {
  return `r${Date.now().toString(36)}${Math.floor(Math.random() * 1296)
    .toString(36)
    .padStart(2, '0')}`;
}

/** the one playground of the page */
export const playground = new Playground();
