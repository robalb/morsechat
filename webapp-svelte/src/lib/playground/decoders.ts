/**
 * The algorithms the playground compares, and the register of them.
 *
 * Each one is fed the same key timings at the same moments and draws its own
 * preview box. What is being looked for is not only how much of a message comes
 * out right — a decoder can be told the answer afterwards and get everything
 * right — but how much of it *changes after it has been shown*. A letter that
 * appears, is read by the operator, and is then silently rewritten as something
 * else two letters later is worse than one that was wrong from the start, and
 * only the side-by-side replay makes the difference visible.
 *
 * Adding one is a matter of writing a `Decoder` and putting it in `ALGORITHMS`
 * at the bottom; the page grows a box for it.
 */
import { AdaptiveDecoder, basesFromWpm, wpmOf } from '$lib/morse/adaptive';
import { decodeBuffer, renderLetters } from '$lib/morse/decode';
import {
  GuentherDecoder,
  basesFromWpm as guentherBases,
  wpmOf as guentherWpm,
  type GuentherOptions,
} from '$lib/morse/guenther';
import { morseTimes } from '$lib/morse/timings';
import { WindowDecoder } from '$lib/morse/window';

import type { Algorithm, DecodeContext, Decoder } from './types';

/**
 * The range an estimated dot is allowed into, in ms — 60wpm to 2wpm. The same
 * bounds lib/morse/adaptive.ts uses, and for the same reason: an estimator fed
 * two presses can produce any number at all, and a wpm of 900 renders as one
 * enormous run of dashes that tells nobody anything.
 */
const MIN_DOT = 20;
const MAX_DOT = 600;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * The buffer's presses. The even entries are sound and the odd ones silence,
 * which is the convention the whole app records in.
 */
function sounds(buffer: number[]): number[] {
  return buffer.filter((_, i) => i % 2 === 0);
}

/* ------------------------------------------------------------------ *
 * 1. Fixed
 * ------------------------------------------------------------------ */

/**
 * The decoder the chat ships with: the slider says how long a dot is, and every
 * press is measured against that.
 *
 * It is the baseline in both senses. It never rewrites a letter — the threshold
 * it decided with is the same one it will still be using at the end of the
 * message, so what is on screen can never be contradicted — and it is wrong
 * about everything the moment the operator's hand is not at the number under
 * the slider. Every other algorithm here is trying to buy the first property
 * back while giving up the second.
 */
class FixedDecoder implements Decoder {
  #buffer: number[] = [];
  #idle = 0;

  addSound(ms: number) {
    this.#buffer.push(ms);
    this.#idle = 0;
  }

  addSilence(ms: number) {
    this.#buffer.push(ms);
    this.#idle = 0;
  }

  idle(ms: number) {
    this.#idle = ms;
  }

  reset() {
    this.#buffer = [];
    this.#idle = 0;
  }

  measuredWpm(): number | null {
    // it does not measure: it is told
    return null;
  }

  render(ctx: DecodeContext): string {
    return decodeBuffer(this.#buffer, {
      wpm: ctx.wpm,
      dialect: ctx.dialect,
      showReadable: ctx.showReadable,
      // the final letter is only readable once its silence has outlasted a
      // letter gap at the speed we are decoding at
      letterComplete: this.#idle >= morseTimes(ctx.wpm).letterGap,
    });
  }
}

/* ------------------------------------------------------------------ *
 * 2. Global average
 * ------------------------------------------------------------------ */

/**
 * The obvious dynamic decoder, and the one worth having on screen precisely
 * because of how it fails.
 *
 * It measures the whole message — split the presses at their own mean, call the
 * short ones dots and the long ones dashes, average each pile — and then
 * decodes the whole message against that measurement. On a hand that holds one
 * speed this is excellent, and better than the slider will ever be, because it
 * finds the operator's actual dot rather than the one they claimed.
 *
 * On a hand that changes speed it is the flicker generator. Every new press
 * moves the mean, the mean moves the threshold, and the threshold re-reads
 * *every letter already on screen*: slow down for one word and the sentence
 * behind it comes apart into es and ts. Nothing is wrong with the estimate —
 * given the whole message, it is the best single number available. The mistake
 * is retroactivity, and having it here in a box next to the others is the
 * clearest statement of the problem the playground was built to solve.
 */
class AveragingDecoder implements Decoder {
  #buffer: number[] = [];
  #idle = 0;

  addSound(ms: number) {
    this.#buffer.push(ms);
    this.#idle = 0;
  }

  addSilence(ms: number) {
    this.#buffer.push(ms);
    this.#idle = 0;
  }

  idle(ms: number) {
    this.#idle = ms;
  }

  reset() {
    this.#buffer = [];
    this.#idle = 0;
  }

  /**
   * One dot, in ms, from the whole message so far.
   *
   * Split at the mean, then take the two piles as a dot and a dash and average
   * what each of them implies about the unit. Splitting at the mean is what
   * makes it naive: a message of nothing but dots has a mean too, and half of
   * those dots fall below it, so the "dots" pile is the shorter half of one
   * cloud and the estimate comes out fast. That is a real property of averaging
   * without a separation test, not an accident of this implementation, and it
   * is left in.
   */
  #dot(): number | null {
    const all = sounds(this.#buffer);
    if (all.length === 0) return null;

    const split = mean(all);
    const short = all.filter((ms) => ms <= split);
    const long = all.filter((ms) => ms > split);

    // everything on one side: the message is all dots, all dashes, or one
    // press long, and there is nothing to tell us which. Reading it as dots is
    // the assumption that loses least — a run of dashes read as dots is a
    // visible mess, dots read as dashes silently swallow the letters.
    if (short.length === 0 || long.length === 0) return clamp(mean(all), MIN_DOT, MAX_DOT);

    // a dash is three units, so both piles are evidence about the same unit
    const dot = (mean(short) + mean(long) / 3) / 2;
    return clamp(dot, MIN_DOT, MAX_DOT);
  }

  #wpm(ctx: DecodeContext): number {
    const dot = this.#dot();
    return dot === null ? ctx.wpm : 1200 / dot;
  }

  measuredWpm(): number | null {
    const dot = this.#dot();
    return dot === null ? null : Math.round(1200 / dot);
  }

  render(ctx: DecodeContext): string {
    const wpm = this.#wpm(ctx);
    return decodeBuffer(this.#buffer, {
      wpm,
      dialect: ctx.dialect,
      showReadable: ctx.showReadable,
      letterComplete: this.#idle >= morseTimes(wpm).letterGap,
    });
  }
}

/* ------------------------------------------------------------------ *
 * 3. Causal / adaptive
 * ------------------------------------------------------------------ */

/**
 * The app's own adaptive decoder (lib/morse/adaptive.ts), wrapped so it can be
 * fed from here.
 *
 * It is in the playground because it is the thing being judged: it is what
 * `straight (adaptive)` in the settings runs, it is the current answer to the
 * flicker problem, and a comparison that did not include it would tell us
 * nothing about whether to keep it. Its bet is that a letter, once shown, is
 * never touched again — the estimate keeps moving, but only ever forwards, onto
 * elements that have not been decoded yet.
 *
 * The wrapper is thin on purpose. Everything interesting is in adaptive.ts, and
 * anything learned here should go back there rather than accumulate in this
 * file.
 */
class CausalDecoder implements Decoder {
  #decoder = new AdaptiveDecoder(basesFromWpm(12));

  addSound(ms: number) {
    this.#decoder.addSound(ms);
  }

  addSilence(ms: number) {
    this.#decoder.addSilence(ms);
  }

  idle(ms: number) {
    // the same rule the keyer's letter timer runs: quiet for longer than the
    // decoder's own split means the character is finished
    if (ms >= this.#decoder.letterSplit) this.#decoder.closeLetter();
  }

  reset(ctx: DecodeContext) {
    this.#decoder.reset(basesFromWpm(ctx.wpm));
  }

  measuredWpm(): number | null {
    return wpmOf(this.#decoder.bases);
  }

  render(ctx: DecodeContext): string {
    // its letters were classified as they arrived and are never reclassified,
    // so all that is left to do is look them up
    return renderLetters(this.#decoder.letters, this.#decoder.pending, {
      dialect: ctx.dialect,
      showReadable: ctx.showReadable,
    });
  }
}

/* ------------------------------------------------------------------ *
 * 4. Guenther (1973), and two variants of it
 * ------------------------------------------------------------------ */

/**
 * lib/morse/guenther.ts, wrapped so it can be fed from here.
 *
 * Three boxes share this wrapper and differ only in their options, which is the
 * point of having them side by side: the paper's algorithm, the paper plus the
 * one thing a chat message breaks that a fifty-pulse transmission does not, and
 * that plus a letter of latency spent on not showing a lone `e`.
 *
 * The dialect comes in through `reset`, because the paper's error correction
 * has to know whether a code is a character at all — that is the only condition
 * under which it is allowed to run.
 */
class GuentherSlot implements Decoder {
  #decoder: GuentherDecoder;
  #dialect: DecodeContext['dialect'] | null = null;

  constructor(options: GuentherOptions) {
    this.#decoder = new GuentherDecoder(guentherBases(12), {
      ...options,
      isCharacter: (code) => (this.#dialect ? Object.hasOwn(this.#dialect.table, code) : false),
    });
  }

  addSound(ms: number) {
    this.#decoder.addSound(ms);
  }

  addSilence(ms: number) {
    this.#decoder.addSilence(ms);
  }

  idle(ms: number) {
    if (ms >= this.#decoder.letterSplit) this.#decoder.closeLetter();
    // past a word gap of silence there is no next letter to reconsider a held
    // one against, so holding it any longer only keeps it off the screen
    if (ms >= this.#decoder.wordSplit) this.#decoder.flush();
  }

  reset(ctx: DecodeContext) {
    this.#dialect = ctx.dialect;
    this.#decoder.reset(guentherBases(ctx.wpm));
  }

  measuredWpm(): number | null {
    return guentherWpm(this.#decoder.bases);
  }

  render(ctx: DecodeContext): string {
    // `preview` is the held letter and the one being keyed: both are drawn as
    // the elements they were keyed as, and only one of them can still change
    return renderLetters(this.#decoder.letters, this.#decoder.preview, {
      dialect: ctx.dialect,
      showReadable: ctx.showReadable,
    });
  }
}

/* ------------------------------------------------------------------ *
 * 5. The window search
 * ------------------------------------------------------------------ */

/**
 * lib/morse/window.ts, wrapped so it can be fed from here.
 *
 * The one box on the page that is allowed to change its mind on screen, and
 * only for the first few letters of a message. What it buys with that is the
 * ability to read a group of elements as a group — to prefer the reading that
 * makes an `h` over the one that makes four `e`s — which nothing that decides
 * one element at a time can do.
 */
class WindowSlot implements Decoder {
  #decoder: WindowDecoder;
  #dialect: DecodeContext['dialect'] | null = null;

  constructor() {
    this.#decoder = new WindowDecoder(100, {
      isCharacter: (code) => (this.#dialect ? Object.hasOwn(this.#dialect.table, code) : false),
    });
  }

  addSound(ms: number) {
    this.#decoder.addSound(ms);
  }

  addSilence(ms: number) {
    this.#decoder.addSilence(ms);
  }

  idle(ms: number) {
    this.#decoder.idle(ms);
    // past a word gap of silence, no letter is going to arrive to push the
    // window along, so what is in it is as read as it will ever be
    if (ms >= this.#decoder.wordSplit) this.#decoder.flush();
  }

  reset(ctx: DecodeContext) {
    this.#dialect = ctx.dialect;
    this.#decoder.reset(1200 / Math.min(Math.max(ctx.wpm, 1), 200));
  }

  measuredWpm(): number | null {
    return Math.round(1200 / this.#decoder.dot);
  }

  render(ctx: DecodeContext): string {
    return renderLetters(this.#decoder.visible, this.#decoder.preview, {
      dialect: ctx.dialect,
      showReadable: ctx.showReadable,
    });
  }
}

/* ------------------------------------------------------------------ *
 * The register
 * ------------------------------------------------------------------ */

/** The algorithms, in the order their boxes appear down the page. */
export const ALGORITHMS: Algorithm[] = [
  {
    id: 'fixed',
    name: 'fixed wpm',
    description: 'decodes against the slider. never rewrites, never adapts.',
    create: () => new FixedDecoder(),
  },
  {
    id: 'average',
    name: 'global average',
    description: 'measures the whole message and re-decodes it. adapts, and rewrites.',
    create: () => new AveragingDecoder(),
  },
  {
    id: 'causal',
    name: 'causal (lib/morse/adaptive.ts)',
    description: 'adapts forwards only: a letter, once shown, is never touched again.',
    create: () => new CausalDecoder(),
  },
  {
    id: 'guenther',
    name: 'guenther 1973',
    description:
      'the paper as written: one threshold off the pulses, dot/4 + dash/2, sloped by the last dash. Runs letters together on a loose hand.',
    create: () => new GuentherSlot({ wordCorrection: true, errorCorrection: true }),
  },
  {
    id: 'guenther-spaces',
    name: 'guenther + measured gaps',
    description:
      'his method, applied to the silences too: an average per gap population, and the boundary between them.',
    create: () =>
      new GuentherSlot({
        spaces: true,
        drag: true,
        wordCorrection: true,
        errorCorrection: true,
      }),
  },
  {
    id: 'guenther-hold',
    name: 'guenther + gaps + hold',
    description:
      'the same, plus two rules against flicker: a finished letter stays dots and dashes until the next gap is measured, and a run of lone e/t raises the letter boundary.',
    create: () =>
      new GuentherSlot({
        spaces: true,
        drag: true,
        hold: true,
        runGuard: true,
        wordCorrection: true,
        errorCorrection: true,
      }),
  },
  {
    id: 'window',
    name: 'window search (lib/morse/window.ts)',
    description:
      'reads a window of elements at many candidate speeds and keeps the reading that makes letters. May re-read the first four letters of a message; never a letter after that.',
    create: () => new WindowSlot(),
  },
];
