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
import { decodeBuffer, renderLetters, type Letter } from '$lib/morse/decode';
import { ScaleDecoder, decodeTimings as decodeScale } from '$lib/morse/scale';
import { morseTimes } from '$lib/morse/timings';
import { WindowDecoder } from '$lib/morse/window';
import { decodeTimings as decodeWindow } from '$lib/morse/window-static';

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
 * 2. The live decoders
 * ------------------------------------------------------------------ */

/** what a decoder that reads the key as it is pressed exposes: the same members
 * on lib/morse/window.ts and lib/morse/scale.ts, which is what lets one slot
 * drive either of them */
type LiveDecoder = WindowDecoder | ScaleDecoder;

/**
 * A live decoder, wrapped so it can be fed from here.
 *
 * These are the boxes on the page that are allowed to change their mind on
 * screen, and only for the first few letters of a message. What they buy with
 * that is the ability to read a group of elements as a group — to prefer the
 * reading that makes an `h` over the one that makes four `e`s — which nothing
 * that decides one element at a time can do.
 */
class LiveSlot implements Decoder {
  #decoder: LiveDecoder;
  #dialect: DecodeContext['dialect'] | null = null;

  constructor(make: (isCharacter: (code: string) => boolean) => LiveDecoder) {
    this.#decoder = make((code) =>
      this.#dialect ? Object.hasOwn(this.#dialect.table, code) : false
    );
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
 * 3. The same searches, on a finished message
 * ------------------------------------------------------------------ */

/** what both whole-message decoders are: a complete buffer in, a line of codes
 * out, once, with nothing kept between calls */
type DecodeWholeMessage = (
  buffer: number[],
  options: { isCharacter: (code: string) => boolean }
) => string;

/**
 * A whole-message decoder, wrapped so it can be fed from here.
 *
 * The same adapter trick the average box uses: an algorithm that wants the whole
 * message is given the whole message by keeping its own copy of what it has been
 * fed, and is run on it. What it cannot be given is the future, so this box
 * stays empty until the message is over.
 *
 * That emptiness is the point of having it next to the live box that shares its
 * algorithm. The two are the same reading; one of them had to guess where the
 * message was going and the other did not. When the operator stops keying, the
 * live box has been reading along the whole time and this one finally says
 * something, and what is being looked for is whether the two lines agree — where
 * they differ is exactly what the live decoder paid for reading in real time.
 *
 * "Over" is a word gap of silence, measured the way the average box measures one:
 * seven dots of the speed the presses themselves imply. Before that the operator
 * may still be in the middle of a message.
 */
class StaticSlot implements Decoder {
  #buffer: number[] = [];
  #idle = 0;

  /** the reading, and the buffer length it was made from: the search is run
   * once per message, not once per animation frame */
  #letters: Letter[] = [];
  #read = -1;

  /** the algorithm this box runs: `decodeTimings` from window-static or scale */
  readonly #decode: DecodeWholeMessage;

  constructor(decode: DecodeWholeMessage) {
    this.#decode = decode;
  }

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
    this.#letters = [];
    this.#read = -1;
  }

  measuredWpm(): number | null {
    // it measures the message inside the search and keeps no estimate of its
    // own to report — the box shows the reading and nothing else
    return null;
  }

  render(ctx: DecodeContext): string {
    const measured = measure(this.#buffer);
    const over = measured !== null && this.#idle >= measured.dot * 7;

    if (over && this.#read !== this.#buffer.length) {
      this.#letters = toLetters(
        this.#decode(this.#buffer, {
          isCharacter: (code) => Object.hasOwn(ctx.dialect.table, code),
        })
      );
      this.#read = this.#buffer.length;
    }
    if (!over) return '';

    return renderLetters(this.#letters, '', {
      dialect: ctx.dialect,
      showReadable: ctx.showReadable,
    });
  }
}

/**
 * `decodeTimings`' line of codes, as the letters `renderLetters` draws — so
 * every box on the page is rendered by the same function and any difference
 * between them is a difference between the algorithms.
 */
function toLetters(text: string): Letter[] {
  const letters: Letter[] = [];
  let wordBreak = false;
  for (const token of text.split(' ')) {
    if (!token) continue;
    if (token === '/') {
      wordBreak = true;
      continue;
    }
    letters.push({ code: token, wordBreak });
    wordBreak = false;
  }
  return letters;
}

/* ------------------------------------------------------------------ *
 * 4. The whole-message average
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
      'reads a window of elements at many candidate speeds and keeps the reading that makes letters. May re-read the first four letters of a message; never a letter after that. Reads a message that opens with a dash at the wrong speed and never recovers, and never finishes a message too short to show it a letter gap.',
    create: () => new LiveSlot((isCharacter) => new WindowDecoder(100, { isCharacter })),
  },
  {
    id: 'window_static',
    name: 'window search, finished message (lib/morse/window-static.ts)',
    description:
      'the same search with the streaming taken out: one set of thresholds fitted to the whole message, once. Shows nothing until the operator stops keying, and should then agree with the box above.',
    create: () => new StaticSlot(decodeWindow),
  },
  {
    id: 'scale',
    name: 'one fitted scale (lib/morse/scale.ts)',
    description:
      'fits one dot and one set of ratios to the hand, so every reading it considers is a coherent one, and weighs what is being keyed now far above what it has already shown, so an operator who changes pace is followed. Same four-letter flicker budget as the window search. Cannot tell `et` from `a`, or any other message with one silence in it to measure, and commits each character the moment a silence ends it — so a pause inside a letter, taken past the budget, is a letter break it cannot take back.',
    create: () => new LiveSlot((isCharacter) => new ScaleDecoder(100, { isCharacter })),
  },
  {
    id: 'scale_static',
    name: 'one fitted scale, finished message (lib/morse/scale.ts)',
    description:
      'the same fit over a finished buffer, with no speed to anchor it. Reads a message of nothing but dashes as one of nothing but dots — `m` comes out as `i` — because at that point the two are the same durations and only the sender knows which.',
    create: () => new StaticSlot(decodeScale),
  },
];
