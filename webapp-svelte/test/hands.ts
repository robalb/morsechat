/**
 * Hands in bulk, at a difficulty you ask for.
 *
 * test/synth.ts makes 117 cases from 11 texts and 10 named hands, and those
 * names are the problem it cannot solve: every case is one of ten points in a
 * six-dimensional space, chosen by hand, and a decoder tuned against them is
 * tuned against ten points. This draws hands from *ranges* instead, so that a
 * set can be as large as the question needs and two runs of a tuning experiment
 * differ by the thing being tuned rather than by which ten hands were picked.
 *
 * The ranges are not invented. `test/difficulty.ts` measures a hand out of a
 * buffer whose text is known, and run over the seven corpus recordings it says
 * what a real hand does:
 *
 *            dot     dash      element gap  letter gap  word gap   wobble
 *   corpus   17-24w  6.9-11.0  1.7-3.4      7.2-20.0    18.7-48.7  .24-.52
 *   synth.ts 2.5-55w 1.6-7.0   1.0          2.9-5.9     6.1-16.0   .09-.35
 *   textbook 15w     3.0       1.0          3.0         7.0        0
 *
 * Read the columns rather than the rows. Every real hand in the corpus keys
 * dashes longer than *any* profile in synth.ts, letter gaps longer than any
 * profile in synth.ts, and word gaps two to four times longer than its most
 * extreme one. The generated set a decoder is refactored against does not
 * contain the region its users live in — and docs/morse-decoder-spec.md §2,
 * which reports the corpus as reaching a 7-dot dash and a 12-dot word gap, is
 * reading the same corpus off the old, narrower measurement.
 *
 * So `real` below is the corpus's own region, `textbook` is the book, `wide` is
 * the union with room around it, and `hard` is the region where the classes
 * overlap and some of the messages are genuinely unreadable. That last one is
 * from Dey, Chugg & Beerel, *Morse Code Datasets for Machine Learning*
 * (arXiv:1807.04239) §II-A, whose datasets scale in difficulty by letting a
 * dash be as short as a dot — "dashes can masquerade as dots and spaces, and
 * vice-versa". A set with no such cases cannot tell an algorithm that lost 3%
 * from one that hit the floor.
 *
 * What comes out is `Recording`s, the same shape lib/playground/recordings.ts
 * holds and test/harness.ts replays, so everything already built to measure the
 * corpus measures these without a line of glue.
 *
 *   import { generate, TIERS } from './hands.ts';
 *   const cases = generate({ tier: 'real', count: 2000, seed: 1 });
 */
import type { Recording } from '$lib/playground/types';

import { hand, random, synth, type Hand } from './synth.ts';

/** an inclusive range a hand parameter is drawn from */
export type Range = [number, number];

export interface Profile {
  /** the speed the dot comes from. Drawn log-uniformly: speed is multiplicative */
  wpm: Range;
  /** the wobble, as `synth.ts` means it: a fraction of each duration, uniform */
  jitter: Range;
  /** a dash, in dots */
  dash: Range;
  /** the silence inside a letter, in dots */
  elementGap: Range;
  /** the silence between letters, in dots */
  letterGap: Range;
  /** the silence between words, in dots */
  wordGap: Range;
  /** how much the speed moves across the message, as a fraction */
  drift: Range;
  /** the chance the hand changes pace at a word boundary, and by what factor */
  step: number;
  stepBy: Range;
  /** the chance any one letter gap is a hesitation, and how far it is stretched */
  hesitate: number;
  hesitateBy: Range;
}

/**
 * The four regions.
 *
 * `real` is the measurement above and nothing else: a set drawn from it is the
 * best available answer to "how will this read for the people who use it". It
 * is also, deliberately, not a hard set — the corpus hands are well separated
 * (d' of 7 to 15 at the dot/dash boundary, and a Bayes error under 2%) and what
 * makes them difficult is that their ratios are nothing like the book's, not
 * that their classes overlap.
 *
 * `wide` is what to tune against: the union of the book and the corpus with
 * room on both sides, so that a constant fitted on it is not fitted to either
 * one's accident. `hard` is what to report a floor against.
 */
export const TIERS: Record<string, Profile> = {
  textbook: {
    wpm: [10, 25], jitter: [0, 0.05], dash: [2.9, 3.1], elementGap: [1, 1],
    letterGap: [2.9, 3.1], wordGap: [6.8, 7.2], drift: [0, 0],
    step: 0, stepBy: [1, 1], hesitate: 0, hesitateBy: [1, 1],
  },
  real: {
    wpm: [16, 25], jitter: [0.22, 0.55], dash: [6.5, 11.5], elementGap: [1.6, 3.5],
    letterGap: [7, 20], wordGap: [18, 50], drift: [-0.2, 0.2],
    step: 0.1, stepBy: [0.6, 1.7], hesitate: 0.15, hesitateBy: [1.5, 3],
  },
  wide: {
    wpm: [5, 40], jitter: [0.05, 0.5], dash: [2, 11.5], elementGap: [1, 3.5],
    letterGap: [2.5, 20], wordGap: [5, 50], drift: [-0.3, 0.3],
    step: 0.15, stepBy: [0.4, 2.5], hesitate: 0.12, hesitateBy: [1.5, 3.5],
  },
  hard: {
    // a dash of 1.5 dots against a wobble of 0.5 is two clusters that overlap:
    // some dashes come out shorter than some dots, and no reading of the
    // durations recovers which was which
    wpm: [5, 45], jitter: [0.35, 0.6], dash: [1.4, 4], elementGap: [1, 3],
    letterGap: [1.8, 6], wordGap: [3, 12], drift: [-0.45, 0.45],
    step: 0.3, stepBy: [0.3, 3], hesitate: 0.2, hesitateBy: [1.5, 4],
  },
};

/* ------------------------------------------------------------------ *
 * What gets keyed
 * ------------------------------------------------------------------ */

/**
 * The words a message is built from, and the families that are not words.
 *
 * `dashes` and `dots` are the messages docs/morse-decoder-spec.md §3 says are
 * undecidable from timings alone: `moot to` and `is his` are the same durations
 * at different speeds, and a decoder gets them right by believing the speed it
 * was told or not at all. They are here in a known proportion so that a
 * scoreboard can quote the two separately — a set that is a third undecidable
 * messages measures the speed prior, and it should be visible when it does.
 */
const VOCABULARY = [
  'hello', 'world', 'this', 'is', 'a', 'test', 'the', 'quick', 'brown', 'fox',
  'my', 'name', 'al', 'ciao', 'mondo', 'good', 'morning', 'thanks', 'nice',
  'copy', 'again', 'please', 'over', 'roger', 'station', 'radio', 'signal',
  'cq', 'de', 'sos', 'morsechat', 'here', 'you', 'from', 'italy', 'weather',
];

const DASH_ONLY = ['t', 'm', 'o', 'to', 'tom', 'moot', 'motto', 'moo', 'tot'];
const DOT_ONLY = ['e', 'i', 's', 'h', 'is', 'his', 'sis', 'see', 'hi', 'she'];
const SHORT = ['e', 't', 'a', 'et', 'te', 'ee', 'tt', 'at', 'it'];

export type Family = 'words' | 'dashes' | 'dots' | 'short' | 'numbers' | 'letters';

/** how much of a set each family is. Words dominate because messages are words */
const FAMILIES: [Family, number][] = [
  ['words', 0.55], ['letters', 0.15], ['dashes', 0.1], ['dots', 0.1],
  ['short', 0.05], ['numbers', 0.05],
];

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';

function pick<T>(rnd: () => number, from: readonly T[]): T {
  return from[Math.floor(rnd() * from.length)];
}

function between(rnd: () => number, [low, high]: Range): number {
  return low + rnd() * (high - low);
}

/** log-uniform, for the parameters where doubling and halving are the same step */
function betweenLog(rnd: () => number, [low, high]: Range): number {
  return Math.exp(Math.log(low) + rnd() * (Math.log(high) - Math.log(low)));
}

function text(rnd: () => number, family: Family): string {
  const words = (source: readonly string[], most: number) =>
    Array.from({ length: 1 + Math.floor(rnd() * most) }, () => pick(rnd, source)).join(' ');

  switch (family) {
    case 'words':
      return words(VOCABULARY, 5);
    case 'dashes':
      return words(DASH_ONLY, 2);
    case 'dots':
      return words(DOT_ONLY, 2);
    case 'short':
      return pick(rnd, SHORT);
    case 'numbers':
      return words(['73', '88', '599', '2025', 'sos', '5nn'], 2);
    case 'letters':
      return Array.from({ length: 2 + Math.floor(rnd() * 6) }, () => pick(rnd, [...ALPHABET])).join('');
  }
}

/* ------------------------------------------------------------------ *
 * The hands
 * ------------------------------------------------------------------ */

export function sampleHand(rnd: () => number, profile: Profile): Hand {
  return hand({
    wpm: betweenLog(rnd, profile.wpm),
    jitter: between(rnd, profile.jitter),
    dash: between(rnd, profile.dash),
    elementGap: between(rnd, profile.elementGap),
    letterGap: between(rnd, profile.letterGap),
    wordGap: between(rnd, profile.wordGap),
    drift: between(rnd, profile.drift),
  });
}

/** a generated message, with the hand that keyed it kept alongside */
export interface Generated extends Recording {
  tier: string;
  family: Family;
  hand: Hand;
  /** the hand the second half was keyed by, where the pace changed mid-message */
  changed: Hand | null;
}

export interface Options {
  tier?: keyof typeof TIERS | Profile;
  count?: number;
  seed?: number;
  /** the mix of texts, where the default proportions are not what is wanted */
  families?: [Family, number][];
}

/**
 * A message, keyed by one hand or — where the profile says so — by a hand that
 * changes pace at a word boundary partway through.
 *
 * The pace change is its own thing rather than more `drift` because the two are
 * different failures: drift is a hand speeding up smoothly, which a decoder can
 * follow, and a step is an operator who stops, thinks, and comes back slower,
 * which is what the corpus's rmswwaq0ex9 does and what
 * test/probe-slowdown.tmp.ts was written for. A message that steps is a message
 * with no single scale in it at all (measured: over half of such cases have no
 * correct reading at *any* single scale — test/probe-oracle.tmp.ts).
 */
function key(rnd: () => number, profile: Profile, message: string): { buffer: number[]; first: Hand; second: Hand | null } {
  const first = sampleHand(rnd, profile);
  const words = message.split(' ');
  const seed = Math.floor(rnd() * 2 ** 31);

  if (rnd() >= profile.step || words.length < 2) {
    return { buffer: stretch(rnd, synth(message, first, seed), first, profile), first, second: null };
  }

  const at = 1 + Math.floor(rnd() * (words.length - 1));
  const factor = between(rnd, profile.stepBy);
  const second = { ...first, wpm: first.wpm * factor };
  const before = synth(words.slice(0, at).join(' '), first, seed);
  const after = synth(words.slice(at).join(' '), second, seed + 1);
  // joined by a word gap of the speed the second half is keyed at, which is
  // what an operator who paused and restarted actually leaves behind
  const join = Math.round((1200 / second.wpm) * second.wordGap);
  return {
    buffer: stretch(rnd, [...before, join, ...after], first, profile),
    first,
    second,
  };
}

/**
 * One silence here and there, stretched: the operator thinking mid-message.
 *
 * Only silences long enough to already be a letter gap are candidates, so a
 * hesitation never turns into an invented letter boundary — what it does is
 * widen the letter-gap cluster, which is exactly what makes the word boundary
 * hard to find and is the thing the corpus does that no profile in synth.ts
 * does.
 */
function stretch(rnd: () => number, buffer: number[], h: Hand, profile: Profile): number[] {
  if (profile.hesitate === 0) return buffer;
  const dot = 1200 / h.wpm;
  return buffer.map((ms, i) => {
    if (i % 2 === 0) return ms;
    if (ms < dot * h.letterGap * 0.8) return ms;
    if (rnd() >= profile.hesitate) return ms;
    return Math.round(ms * between(rnd, profile.hesitateBy));
  });
}

/**
 * A set of hands.
 *
 * Every case gets its own stream, seeded from the set's seed and the case's
 * index, so that asking for 5000 cases gives the same first 2000 as asking for
 * 2000 — a scoreboard taken at one size stays comparable to one taken at
 * another, and a case that fails can be reproduced on its own.
 */
export function generate(options: Options = {}): Generated[] {
  const { count = 500, seed = 1, families = FAMILIES, tier = 'wide' } = options;
  const name = typeof tier === 'string' ? tier : 'custom';
  const profile = typeof tier === 'string' ? TIERS[tier] : tier;
  if (!profile) throw new Error(`no tier "${name}"`);

  const total = families.reduce((a, [, weight]) => a + weight, 0);
  const out: Generated[] = [];

  for (let i = 0; i < count; i++) {
    const rnd = random((seed * 2654435761 + i * 2246822519) >>> 0);

    let roll = rnd() * total;
    let family: Family = families[0][0];
    for (const [one, weight] of families) {
      roll -= weight;
      if (roll <= 0) {
        family = one;
        break;
      }
    }

    const message = text(rnd, family);
    const { buffer, first, second } = key(rnd, profile, message);

    out.push({
      id: `${name}-${seed}-${i}`,
      buffer,
      // the slider the operator left it on: usually near the hand, sometimes
      // not, because an operator who has not touched it since the last message
      // is the common case and a decoder is entitled to no better a prior
      wpm: Math.round(Math.min(Math.max(first.wpm * between(rnd, [0.7, 1.4]), 5), 50)),
      expected: message,
      created: new Date(0).toISOString(),
      tier: name,
      family,
      hand: first,
      changed: second,
    });
  }
  return out;
}
