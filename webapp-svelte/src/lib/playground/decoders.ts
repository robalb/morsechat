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
 * Three are left of the eight this page was used to choose between: the slider
 * the chat ships with, the whole-message average the receiver and the server
 * run, and the window search. The ones that went — a streaming global average,
 * the app's causal decoder, and three variants of Guenther 1973 — are in the
 * history if the comparison ever needs re-running; keeping them on the page
 * meant maintaining five algorithms nothing was going to use.
 *
 * Adding one is a matter of writing a `Decoder` and putting it in `ALGORITHMS`
 * at the bottom; the page grows a box for it.
 */
import { decodeMessage, measure } from '$lib/morse/average';
import { decodeBuffer, renderLetters } from '$lib/morse/decode';
import { morseTimes } from '$lib/morse/timings';
import { WindowDecoder } from '$lib/morse/window';

import type { Algorithm, DecodeContext, Decoder } from './types';

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
 * the slider. The other two are trying to keep the first property while giving
 * up the second.
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
 * 2. The window search
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
 * 3. The whole-message average
 * ------------------------------------------------------------------ */

/**
 * lib/morse/average.ts: the receiver's decoder, shown here mid-message.
 *
 * It does not belong on a page about live previews and is here anyway, because
 * the question it answers is one the page keeps raising — how much of what the
 * live decoders get wrong is *hard*, and how much of it is only hard because
 * the future has not happened yet. The gap between its box and the other two is
 * the cost of not knowing how the message ends.
 *
 * Letters appear as they are keyed, like every other box. The one thing it will
 * not do is show a letter it is in no position to know: until a dash has
 * arrived there is only one cluster of presses, every one of them is being read
 * as a dot, and the reading on offer is `eeee` for what is about to be an `h`.
 * So while that is true the elements stay dots and dashes, and they become
 * letters the moment there is something to measure them against.
 */
class WholeMessageDecoder implements Decoder {
  #buffer: number[] = [];
  #idle = 0;

  /**
   * Whether the text has been shown as letters yet.
   *
   * Sticky. Going back from letters to dots and dashes is a flash of its own —
   * and it is what happens without this, because a message that has been quiet
   * long enough to be read is not necessarily finished: the operator keys the
   * next letter and the reading that was on screen is not available any more.
   */
  #reading = false;


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
    this.#reading = false;
  }

  measuredWpm(): number | null {
    const measured = measure(this.#buffer);
    return measured === null ? null : Math.round(1200 / measured.dot);
  }

  render(ctx: DecodeContext): string {
    const measured = measure(this.#buffer);
    if (measured === null) return '';

    // the last letter is finished once the key has been up for a letter gap,
    // the same rule every other box here follows
    const complete = this.#idle >= measured.dot * 3;

    // A message of one cluster is a message with no dash in it *yet*. On the
    // wire that means an operator who really did key nothing but dots and it is
    // read as such; here it usually means the dash has not been keyed yet, so
    // the elements stay elements rather than being shown as a run of `e`s that
    // is about to turn into an `h`. A message that has ended without one is
    // read anyway: there is nothing else coming.
    if ((measured.separated && measured.dashes >= 2) || (complete && this.#idle >= measured.dot * 7)) {
      this.#reading = true;
    }


    return decodeMessage(this.#buffer, {
      dialect: ctx.dialect,
      showReadable: ctx.showReadable && this.#reading,
      wpm: ctx.wpm,
      complete,
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
    id: 'global_average_simple',
    name: 'global average simple (average.ts)',
    description:
      'the receiver and the server: measures the whole message once, then decodes it once. Reads nothing until the operator stops.',
    create: () => new WholeMessageDecoder(),
  },
  {
    id: 'window',
    name: 'window search (lib/morse/window.ts)',
    description:
      'reads a window of elements at many candidate speeds and keeps the reading that makes letters. May re-read the first four letters of a message; never a letter after that.',
    create: () => new WindowSlot(),
  },
];
