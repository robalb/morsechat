/**
 * Key buffers, generated instead of keyed.
 *
 * The corpus in lib/playground/recordings.ts is five hand-keyed messages. That
 * is enough to judge an algorithm — a real hand does things no generator thinks
 * of — and far too little to refactor one against: a change that breaks the
 * measurement on dot-heavy text, or on a hand whose dashes are seven dots long,
 * has a one in five chance of showing up. So this makes hands to order.
 *
 * A hand here is six numbers: the speed, how much every duration wobbles, how
 * long a dash is in dots, how long the two silences are in dots, and how much
 * the speed drifts from the first press to the last. Textbook morse is
 * (3, 3, 7) with no wobble; the recordings in the corpus are nothing like that,
 * and neither are most of the profiles below.
 *
 * Everything is seeded, so the same case is the same buffer on every machine
 * and every run. That is what makes it usable as a fixed point: the outputs of
 * `average.ts` over these cases are frozen in test/golden/average.json, and a
 * refactor that changes any of them is a refactor that changed behaviour.
 */
import getDialect from '$lib/utils/dialects';

const DIALECT = getDialect('international');

/** text -> code, from the same table the decoder reads back */
const CODES = new Map<string, string>();
for (const [code, char] of Object.entries(DIALECT.table)) {
  if (!CODES.has(char)) CODES.set(char, code);
}

/** mulberry32: small, seeded, and identical everywhere */
function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** the hand a message is keyed by */
export interface Hand {
  /** the speed the dot comes from: `1200 / wpm` ms */
  wpm: number;
  /** how much each duration wobbles, as a fraction of itself */
  jitter: number;
  /** a dash, in dots. The textbook says 3; the corpus has hands at 7 */
  dash: number;
  /** the silence that ends a letter, in dots. Textbook 3 */
  letterGap: number;
  /** the silence that ends a word, in dots. Textbook 7 */
  wordGap: number;
  /** how much faster the last press is than the first, as a fraction */
  drift: number;
}

const TEXTBOOK: Hand = { wpm: 15, jitter: 0, dash: 3, letterGap: 3, wordGap: 7, drift: 0 };

export function hand(over: Partial<Hand> = {}): Hand {
  return { ...TEXTBOOK, ...over };
}

/**
 * One message, keyed by one hand.
 *
 * The convention is the app's: the even entries are presses and the odd ones
 * the silences between them, and the buffer ends on a press — the silence after
 * the last one has not ended yet, which is exactly the situation the decoder is
 * asked about.
 */
export function synth(text: string, h: Hand, seed = 1): number[] {
  const rnd = random(seed);
  const buffer: number[] = [];

  /** the durations, before the wobble, at a given point through the message */
  const dotAt = (progress: number) => (1200 / h.wpm) / (1 + h.drift * progress);
  const wobble = (ms: number) => {
    if (h.jitter === 0) return Math.round(ms);
    // uniform, not gaussian: a hand's error is bounded, and a tail that reaches
    // three times the dot would be testing the outlier handling rather than the
    // measurement
    return Math.max(1, Math.round(ms * (1 + h.jitter * (rnd() * 2 - 1))));
  };

  const words = text.trim().toLowerCase().split(/\s+/);
  const elements: { ms: (dot: number) => number; gap: (dot: number) => number }[] = [];

  for (const [w, word] of words.entries()) {
    for (const [c, char] of [...word].entries()) {
      const code = CODES.get(char);
      if (code === undefined) throw new Error(`nothing in the table keys "${char}"`);
      for (const [e, element] of [...code].entries()) {
        const last = e === code.length - 1;
        const endsWord = last && c === word.length - 1;
        const endsLetter = last;
        elements.push({
          ms: (dot) => (element === '-' ? dot * h.dash : dot),
          gap: (dot) =>
            endsWord && w < words.length - 1
              ? dot * h.wordGap
              : endsLetter
                ? dot * h.letterGap
                : dot,
        });
      }
    }
  }

  for (const [i, element] of elements.entries()) {
    const dot = dotAt(elements.length < 2 ? 0 : i / (elements.length - 1));
    buffer.push(wobble(element.ms(dot)));
    if (i < elements.length - 1) buffer.push(wobble(element.gap(dot)));
  }
  return buffer;
}

/** a generated message, ready to be measured and read back */
export interface Case {
  id: string;
  text: string;
  buffer: number[];
  /** the wpm the sender's slider claimed, which is not always the hand's */
  wpm: number;
}

/** the texts. Short and long, dot-heavy and dash-heavy, and one of each extreme */
const TEXTS: Record<string, string> = {
  hello: 'hello world',
  pangram: 'the quick brown fox',
  dots: 'his sis is', // nothing but dots: the message with no dash to measure against
  dash_heavy: 'moon tom', // fifteen dashes and one dot to find among them
  all_dash: 'moot to', // nothing but dashes: one cluster again, and a long one
  mixed: 'cq de morsechat',
  numbers: 'sos 73 88',
  single: 'e',
  pair: 'et',
  word: 'a',
  long: 'this is a test this is a test of the decoder at length',
};

/** the hands. Every one of these is a shape the corpus or the ratios in
 * average.ts have an opinion about */
const HANDS: Record<string, Hand> = {
  textbook: hand(),
  fast: hand({ wpm: 35, jitter: 0.12 }),
  slow: hand({ wpm: 5, jitter: 0.12 }),
  sloppy: hand({ jitter: 0.35 }),
  // the corpus hand: a short dot against a very long dash
  heavy_dash: hand({ wpm: 20, jitter: 0.2, dash: 7, letterGap: 5, wordGap: 12 }),
  // a dash barely longer than a dot: the one cloud `SEPARATION` refuses to cut
  narrow_dash: hand({ wpm: 15, jitter: 0.1, dash: 1.6 }),
  // pauses inside letters as long as the textbook's letter gap
  hesitant: hand({ wpm: 18, jitter: 0.25, letterGap: 6, wordGap: 14 }),
  // speeding up by a third across the message
  drifting: hand({ wpm: 15, jitter: 0.15, drift: 0.33 }),
  // at the edges of the range a dot estimate is clamped into
  very_fast: hand({ wpm: 55, jitter: 0.1 }),
  very_slow: hand({ wpm: 2.5, jitter: 0.1 }),
};

function build(): Case[] {
  const cases: Case[] = [];
  for (const [text, message] of Object.entries(TEXTS)) {
    for (const [name, h] of Object.entries(HANDS)) {
      // the seed is derived from the case, so adding one case does not move the
      // buffers of the others
      const seed = [...`${text}/${name}`].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
      cases.push({
        id: `${text}/${name}`,
        text: message,
        buffer: synth(message, h, seed),
        wpm: h.wpm,
      });
    }
  }

  // and the shapes that are not messages at all
  cases.push(
    { id: 'edge/empty', text: '', buffer: [], wpm: 15 },
    { id: 'edge/one-press', text: 'e', buffer: [80], wpm: 15 },
    { id: 'edge/one-dash', text: 't', buffer: [240], wpm: 15 },
    { id: 'edge/silence-first', text: 'e', buffer: [0, 200, 80], wpm: 15 },
    // a key left down: the outlier the geometric mean exists to survive
    { id: 'edge/stuck-key', text: 'hello world', buffer: [...synth('hello world', hand({ jitter: 0.15 }), 99), 60, 9000], wpm: 15 },
    // out of the clamp on both sides
    { id: 'edge/too-fast', text: 'sos', buffer: synth('sos', hand({ wpm: 200 })), wpm: 200 },
    { id: 'edge/too-slow', text: 'sos', buffer: synth('sos', hand({ wpm: 1 })), wpm: 1 }
  );
  return cases;
}

export const CASES: Case[] = build();
