/**
 * The playground's replay, without the playground.
 *
 * src/pages/playground.html answers "which algorithm reads this hand the way
 * its owner meant it" by showing the boxes side by side and letting a person
 * watch them. That is the right tool for judging an algorithm and a useless one
 * for noticing that a change broke it, because it needs a person, a browser and
 * a minute per recording. This runs the same corpus through the same decoders
 * in a few milliseconds and turns each replay into numbers a test can assert
 * on.
 *
 * It is the same event stream lib/playground/engine.svelte.ts feeds: sound,
 * silence, and the idle ticks in between. The ticks are not an implementation
 * detail that can be skipped — the last letter of a message is only decoded
 * once its silence has outlasted a letter gap, and the causal decoder closes
 * every letter on an idle tick — so a harness that fed only the buffer would
 * measure a decoder the app never runs. What is dropped is real time: the ticks
 * are counted out rather than waited for, which is why this takes no longer
 * than the arithmetic.
 *
 * The three measurements it takes are the three questions the playground was
 * built to ask, in the order they matter:
 *
 *   churn      Did text that was already on screen change afterwards? This is
 *              the failure the causal decoder exists to prevent, and it is
 *              worse than a wrong reading: the operator is keying the next
 *              letter while trusting the ones behind it.
 *   runs       How much of the output is "eeee" or "tttt" — the shape a message
 *              collapses into when the split lands on the wrong side of every
 *              press. It is the visible symptom of a bad estimate, and it
 *              survives in the final text where churn does not.
 *   accuracy   How much of it reads as what was keyed. Last, because an
 *              algorithm can buy accuracy with churn and that is not a trade
 *              worth making.
 */
import getDialect from '$lib/utils/dialects';
import type { Decoder, DecodeContext, Recording } from '$lib/playground/types';

/**
 * How often the decoder is told the key is still up, in ms.
 *
 * The engine ticks on an animation frame, so this is one frame at 60Hz. It is
 * the resolution of every "how long has it been quiet" decision a decoder
 * makes, and making it much coarser would let a letter gap be missed.
 */
const TICK = 16;

/** how long the ticks keep running after the last release: the engine's IDLE_MAX */
const IDLE_MAX = 4000;

/** the corpus is international morse, as the playground fixes it */
const DIALECT = getDialect('international');

/** one frame of the preview, as the operator would have seen it */
export interface Frame {
  /** ms since the start of the message */
  at: number;
  text: string;
}

/** something the preview showed and then took back */
export interface Rewrite {
  at: number;
  from: string;
  to: string;
}

export interface Result {
  recording: Recording;
  /** what the operator meant, from the corpus */
  expected: string;
  /** the last thing the preview said */
  final: string;
  /** the speed the algorithm settled on, or null if it was told */
  measuredWpm: number | null;

  frames: Frame[];

  /**
   * Every time committed text changed after being shown. Empty is the only
   * acceptable value for a causal decoder; for the averaging one it is the
   * whole point of having it on the page.
   */
  rewrites: Rewrite[];

  /**
   * How many characters of already-shown text were taken back over the whole
   * replay. Two decoders can both churn once and be very differently wrong.
   */
  churnedChars: number;

  /** runs of three or more `e`s or `t`s in the final text */
  runs: number;
  /** the longest such run, in characters */
  longestRun: number;
  /** the longest such run in *any* frame — flicker that did not survive to the end */
  peakRun: number;

  /** positional agreement with `expected`, 0..1 */
  accuracy: number;

  /**
   * How long after the last press the preview finally said what it ended up
   * saying, in ms.
   *
   * The price of not being wrong. A decoder that waits before showing a letter
   * cannot be caught rewriting it, and taken to its extreme that is a decoder
   * which shows nothing until the operator stops keying — so the delay has to
   * be reported next to the churn it buys, or the comparison is rigged.
   */
  tailLag: number;
}

/**
 * The part of a frame that has been committed: what is on screen minus the
 * characters that are still dots and dashes.
 *
 * A character being keyed is drawn as the elements received so far and is
 * replaced by a letter when it ends, so it changes constantly and by design.
 * Only what is behind it is a promise, and only breaking that promise counts.
 *
 * *Every* trailing group of elements is dropped, not just the last one, because
 * a decoder is allowed to keep more than one character un-decided — the `hold`
 * variant keeps the finished letter as well as the one being keyed, and that is
 * exactly its bargain: it may change its mind about a character for as long as
 * it has not shown the operator a letter to read.
 */
function committed(text: string): string {
  return text.replace(/(?:^|\s)[.\-–]+(?:\s+[.\-–]+)*$/, '');
}

/** the same text, comparable to a line typed into `expected` by hand */
function normalise(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** runs of three or more of the same letter, for `e` and `t` only */
function runsOf(text: string): { count: number; longest: number } {
  let count = 0;
  let longest = 0;
  for (const match of text.matchAll(/(e{3,}|t{3,})/gi)) {
    count++;
    longest = Math.max(longest, match[0].length);
  }
  return { count, longest };
}

/**
 * Character-for-character agreement, as webapp-migration-tools/adaptive-sim.ts
 * scores it: matching positions over the longer of the two.
 *
 * It is a rough number and is meant to be. A dropped letter early on shifts
 * everything after it and the score collapses, which flatters nobody and is
 * fine for a threshold — an algorithm that drops the second letter of every
 * message *should* score badly.
 */
function agreement(got: string, want: string): number {
  if (!want) return 0;
  const a = normalise(got).replace(/ /g, '');
  const b = normalise(want).replace(/ /g, '');
  if (!a && !b) return 1;
  let same = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] === b[i]) same++;
  }
  return same / Math.max(a.length, b.length);
}

/**
 * Types one recording into one decoder and watches the preview.
 *
 * The decoder is reset against the recording's own wpm, which is what the
 * playground does on playback: the fixed decoder reads the slider, and replaying
 * against some other number would measure the slider rather than the algorithm.
 */
export function replay(decoder: Decoder, recording: Recording, options: { showReadable?: boolean } = {}): Result {
  const ctx: DecodeContext = {
    wpm: recording.wpm,
    dialect: DIALECT,
    showReadable: options.showReadable ?? true,
  };

  decoder.reset(ctx);

  const frames: Frame[] = [];
  const rewrites: Rewrite[] = [];
  let shown = '';
  let churnedChars = 0;
  let peakRun = 0;
  let clock = 0;
  /** when the last press ended, for `tailLag` */
  let lastPress = 0;

  const snap = () => {
    const text = decoder.render(ctx);
    frames.push({ at: clock, text });
    peakRun = Math.max(peakRun, runsOf(text).longest);

    const done = committed(text);
    if (!done.startsWith(shown)) {
      // find how much of the promise survived, so that a decoder that rewrote
      // one letter is not scored like one that rewrote the sentence
      let keep = 0;
      while (keep < Math.min(done.length, shown.length) && done[keep] === shown[keep]) keep++;
      rewrites.push({ at: clock, from: shown, to: done });
      churnedChars += shown.length - keep;
      shown = done;
    } else if (done.length > shown.length) {
      shown = done;
    }
  };

  /** the key has been up for `total` ms: tick the way an animation frame would */
  const idle = (total: number) => {
    for (let elapsed = TICK; elapsed <= total; elapsed += TICK) {
      decoder.idle(elapsed);
      clock += TICK;
      snap();
    }
  };

  // the even entries are presses and the odd ones the silences after them,
  // which is the convention the whole app records in
  for (let i = 0; i < recording.buffer.length; i++) {
    const ms = recording.buffer[i];
    if (i % 2 === 0) {
      clock += ms;
      lastPress = clock;
      decoder.addSound(ms);
      snap();
    } else {
      // the silence is only reported to the decoder when it ends — the next
      // press is what measures it — so what the decoder sees during it is ticks
      idle(ms);
      decoder.addSilence(ms);
      snap();
    }
  }

  // the message has ended, and the last letter is still waiting for a silence
  // long enough to finish it
  idle(IDLE_MAX);

  const final = frames.length ? frames[frames.length - 1].text : '';
  const { count, longest } = runsOf(final);
  const settled = frames.find((f) => f.text === final);

  return {
    recording,
    expected: recording.expected,
    final,
    measuredWpm: decoder.measuredWpm(),
    frames,
    rewrites,
    churnedChars,
    runs: count,
    longestRun: longest,
    peakRun,
    accuracy: agreement(final, recording.expected),
    tailLag: Math.max(0, (settled?.at ?? 0) - lastPress),
  };
}
