/**
 * The dynamic decoder: the key, read as it is being pressed.
 *
 * `WindowDecoder` is fed `addSound`/`addSilence` as the key is released and
 * `idle` between presses, and exposes what to draw (`visible`, `preview`), the
 * speed it is measuring (`dot`) and how long a caller must wait before a letter
 * or a word is over (`letterSplit`, `wordSplit`). Its users are
 * lib/morse/keyer.svelte.ts, which drives the chat, and the window box in
 * lib/playground/decoders.ts.
 *
 * Rather than decide each press as it arrives, it re-reads a window of the last
 * few elements as a group — which is what lets it prefer an `h` over four `e`s.
 * The price of that is a letter that changes after it is shown, so it is only
 * allowed for the first `FLICKER_LETTERS` letters of a message; past that, a
 * letter leaving the window is frozen and never touched again.
 *
 * The algorithm itself is ./window-core.ts, shared with ./window-static.ts.
 */

import type { Letter } from './decode';
import {
  read,
  search,
  type KeyEvent,
  type Reading,
  type Thresholds,
  type WindowOptions,
} from './window-core';

export type { Letter, WindowOptions };

/** how many letters into a message re-reading is allowed */
const FLICKER_LETTERS = 4;

/** how many letters stay in the window after that: the latency, in letters */
const HORIZON = 1;

/** how many frozen elements the window keeps behind the frontier as evidence.
 * Without them a window holding one letter has no idea what a letter gap looks
 * like for this operator. */
const KEEP_EVENTS = 12;

/** the most elements the window holds before it freezes the oldest letter
 * regardless: a runaway window is a decoder that shows nothing */
const MAX_EVENTS = 40;

/** the range a dot estimate is allowed into, in ms: 60wpm to 2wpm */
const MIN_DOT = 20;
const MAX_DOT = 600;

/** what a word break costs. Word gaps are not measured here, so this charge is
 * the only thing standing against a break: without it every letter is its own
 * word. Eight times what window-static.ts charges, which does measure them. */
const WORD_COST = 1.2;

/** how hard the running estimate pulls on the search, per element in the
 * window. What stops it re-inventing the hand on every element. */
const PRIOR_COST = 0.8;

/** how far the estimate moves towards the winner, and the most it may move at
 * once */
const ALPHA = 0.4;
const MAX_STEP = 0.25;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export class WindowDecoder {
  /** the letters that have left the window. Nothing here ever changes. */
  letters: Letter[] = [];

  /** the elements not yet frozen, and `#kept` older ones in front of them that
   * are only there to be measured */
  #events: KeyEvent[] = [];
  #kept = 0;

  /** how long the key has been up since the last release */
  #idle = 0;

  #reading: Reading;

  /** the hand, as currently understood: one dot, in ms */
  #dot: number;

  /** whether the message has ever been longer than `FLICKER_LETTERS`. Sticky:
   * a re-reading that merges two letters would otherwise put a long message back
   * under the limit and re-open permission to rewrite it. */
  #settled = false;

  readonly #isCharacter: (code: string) => boolean;

  constructor(dot: number, options: WindowOptions) {
    this.#dot = clamp(dot, MIN_DOT, MAX_DOT);
    this.#isCharacter = options.isCharacter;
    this.#reading = this.#empty();
  }

  reset(dot: number) {
    this.#dot = clamp(dot, MIN_DOT, MAX_DOT);
    this.letters = [];
    this.#events = [];
    this.#kept = 0;
    this.#idle = 0;
    this.#settled = false;
    this.#reading = this.#empty();
  }

  #empty(): Reading {
    return {
      cost: 0,
      letters: [],
      pending: '',
      dot: this.#dot,
      thresholds: { dash: this.#dot * 2, letter: this.#dot * 2, word: this.#dot * 5 },
    };
  }

  /** the speed the search currently believes in, as one dot in ms */
  get dot(): number {
    return this.#dot;
  }

  /**
   * The silence after which the current reading would end the character being
   * keyed. Falls back to a multiple of the dot where the reading puts the
   * threshold at `Infinity`, because a caller waiting on this is waiting with a
   * timer, and a timer set to `Infinity` fires immediately.
   */
  get letterSplit(): number {
    const { letter } = this.#reading.thresholds;
    return Number.isFinite(letter) ? letter : this.#dot * 3;
  }

  /** the silence after which the current reading would end a word: the keyer
   * and the playground use it to know when nothing more is coming */
  get wordSplit(): number {
    const { word } = this.#reading.thresholds;
    return Number.isFinite(word) ? word : this.letterSplit * 3;
  }

  /** the letters still inside the window, drawn as their dots and dashes because
   * they may yet be read differently. Early in a message they are shown as
   * letters by `visible` instead. */
  get preview(): string {
    const codes = this.#settled ? this.#reading.letters.map((l) => l.code) : [];
    if (this.#reading.pending) codes.push(this.#reading.pending);
    return codes.join(' ');
  }

  /** what is on screen as letters: the frozen text, and — early on — the window */
  get visible(): Letter[] {
    return this.#settled ? this.letters : [...this.letters, ...this.#reading.letters];
  }

  addSound(ms: number) {
    this.#events.push({ ms, sound: true });
    this.#idle = 0;
    this.#update(true);
  }

  addSilence(ms: number) {
    // a silence before the first press says nothing about the message
    if (this.#events.length === 0) return;
    this.#events.push({ ms, sound: false });
    this.#idle = 0;
    this.#update(true);
  }

  /**
   * The key has been up for `ms` and is still up: the silence at the end of the
   * window has no measured length, so the search is told how long it has been
   * and closes the last letter once that outlasts a letter gap.
   *
   * It does not learn from this. An idle tick arrives sixty times a second, and
   * letting them move the estimate lets it walk: a second of quiet was once
   * enough to carry a 60ms dot to the 600ms ceiling.
   */
  idle(ms: number) {
    this.#idle = ms;
    this.#update(false);
  }

  /** nothing more is coming: freeze the window as it reads now, or its last
   * letters stay dots and dashes waiting for letters that never arrive */
  flush() {
    this.#update(false);
    this.#freeze(this.#reading.letters.length);
  }

  #update(learn: boolean) {
    this.#reading = this.#best(learn);
    if (this.letters.length + this.#reading.letters.length > FLICKER_LETTERS) {
      this.#settled = true;
    }

    const spare = this.#reading.letters.length - HORIZON;
    if (this.#settled && spare > 0) {
      this.#freeze(spare);
    } else if (this.#events.length > MAX_EVENTS && this.#reading.letters.length > 0) {
      // no letter boundary the search believes in: its best guess beats nothing
      this.#freeze(1);
    }
  }

  /** moves the oldest `count` letters of the window into the frozen text. Their
   * elements stay behind the frontier as evidence — see `KEEP_EVENTS`. */
  #freeze(count: number) {
    const frozen = this.#reading.letters.slice(0, count);
    if (frozen.length === 0) return;
    for (const letter of frozen) {
      this.letters.push({ code: letter.code, wordBreak: letter.wordBreak });
    }

    this.#kept = frozen[frozen.length - 1].end;
    const drop = Math.max(0, this.#kept - KEEP_EVENTS);
    if (drop > 0) {
      this.#events = this.#events.slice(drop);
      this.#kept -= drop;
    }
    // re-read what is left, without learning: this window has already taught
    // the estimate everything it had to say
    this.#reading = this.#best(false);
  }

  /** the cheapest reading of the window. Only new elements may move the running
   * estimate — see `idle`. */
  #best(learn: boolean): Reading {
    if (this.#events.length === 0) return this.#empty();

    // the frozen elements are in the candidate lists too: their reading is
    // fixed, their durations are still this operator's
    const sounds = this.#events.filter((e) => e.sound).map((e) => e.ms);
    const gaps = this.#events.filter((e) => !e.sound).map((e) => e.ms);

    const best = search(sounds, gaps, (thresholds) => this.#read(thresholds));
    if (best === null) return this.#empty();

    if (learn && best.dot > 0) {
      // the estimate follows the winner rather than jumping to it: one window's
      // best fit is one sample of a hand, and the hand is what is being tracked
      const moved = this.#dot + ALPHA * (best.dot - this.#dot);
      const step = clamp(moved, this.#dot * (1 - MAX_STEP), this.#dot * (1 + MAX_STEP));
      this.#dot = clamp(step, MIN_DOT, MAX_DOT);
    }
    return best;
  }

  /** the window read at one set of thresholds: the core's read, plus the charge
   * that only exists while a hand is being tracked */
  #read(thresholds: Thresholds): Reading {
    const reading = read(this.#events, thresholds, {
      isCharacter: this.#isCharacter,
      wordCost: WORD_COST,
      frozen: this.#kept,
      idle: this.#idle,
    });

    // how far the dot this reading implies is from the hand we believe we are
    // reading
    if (reading.dot > 0) {
      const drift = Math.log(reading.dot / this.#dot);
      reading.cost += PRIOR_COST * drift * drift * this.#events.length;
    }
    return reading;
  }
}
