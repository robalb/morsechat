/**
 * How hard a keyed message is, before any decoder looks at it.
 *
 * The scoreboards in test/decoders.test.ts and the probes say how much of a set
 * a decoder read. What they cannot say is whether the set was hard — so a
 * change that scores 103 where the last one scored 101 is two hands better, or
 * two hands luckier, and there is no way to tell from the number. This measures
 * the hands themselves, with no decoder involved, so that accuracy can be
 * reported against difficulty rather than on its own.
 *
 * The method is out of Dey, Chugg & Beerel, *Morse Code Datasets for Machine
 * Learning* (arXiv:1807.04239), §IV: put every class of thing the model has to
 * tell apart in one space, measure how far apart the classes sit against how
 * wide they are, and derive from that a number that predicts accuracy without
 * training anything. Their datasets are fixed-width frames of pixel intensities
 * and 64 codeword classes; ours are variable-length timings with five classes —
 * dot, dash, and the three silences — so what carries over is the shape of the
 * metric and not their arithmetic.
 *
 * Two differences worth stating, because they change what the numbers mean:
 *
 *   - Morse is multiplicative, so everything here is measured in log space. A
 *     hand at 5 wpm and one at 40 wpm with the same *proportional* wobble are
 *     equally hard, and a metric in milliseconds would call the slow one eight
 *     times worse.
 *   - The paper assumes Gaussian classes and derives error bounds from the
 *     Gaussian tail. Real hands are not Gaussian and test/synth.ts's wobble is
 *     uniform by choice, so the parametric number (`d`, their D) is reported
 *     next to an empirical one (`bayes`) that counts how many durations of this
 *     message actually fall on the wrong side of the best split there is. Where
 *     the two disagree, the empirical one is the true statement about this
 *     message and the parametric one is the comparable statement across
 *     messages.
 *
 * The reason it takes an `expected` text rather than reading the buffer on its
 * own: the classes are only known if the message is known. That is also what
 * makes it work on the corpus — the seven recordings have their `expected`
 * typed in by hand — so a generated hand and a real one are measured by exactly
 * the same code, which is the only way "are the generated hands like real ones"
 * is a question with an answer.
 */
import type { Dialect } from '$lib/utils/dialects';

/** the five classes a duration can belong to, as this message actually keyed them */
export interface Classes {
  dots: number[];
  dashes: number[];
  elementGaps: number[];
  letterGaps: number[];
  wordGaps: number[];
}

/** every duration in one array, for the whole-message statistics */
const all = (c: Classes): number[] => [
  ...c.dots, ...c.dashes, ...c.elementGaps, ...c.letterGaps, ...c.wordGaps,
];

/**
 * Which class each duration in a buffer belongs to, given what was keyed.
 *
 * Returns null when the buffer and the text disagree about how many elements
 * there are — a recording where the operator fumbled a letter, keyed an extra
 * dot, or typed the wrong thing into `expected`. Those cannot be labelled and
 * must not be guessed at: a mislabelled hand would show up as a hand with
 * enormous spread, which is exactly the signal this file exists to report.
 *
 * @param buffer - alternating press/silence durations, starting and ending with
 * a press, per docs/morse-decoder-spec.md §2.
 */
export function align(buffer: number[], expected: string, dialect: Dialect): Classes | null {
  const codes = new Map<string, string>();
  for (const [code, char] of Object.entries(dialect.table)) {
    if (!codes.has(char)) codes.set(char, code);
  }

  /** the elements the text implies, each with the silence that should follow it */
  const wanted: { dash: boolean; gap: 'element' | 'letter' | 'word' | null }[] = [];
  const words = expected.trim().toLowerCase().split(/\s+/).filter(Boolean);

  for (const [w, word] of words.entries()) {
    for (const [c, char] of [...word].entries()) {
      const code = codes.get(char);
      if (code === undefined) return null;
      for (const [e, element] of [...code].entries()) {
        const endsLetter = e === code.length - 1;
        const endsWord = endsLetter && c === word.length - 1;
        wanted.push({
          dash: element === '-',
          gap: endsWord ? (w < words.length - 1 ? 'word' : null) : endsLetter ? 'letter' : 'element',
        });
      }
    }
  }

  // the buffer ends on a press, so it holds one silence fewer than it holds
  // presses — the last silence has not finished and is not in it
  if (wanted.length === 0 || buffer.length !== wanted.length * 2 - 1) return null;

  const out: Classes = { dots: [], dashes: [], elementGaps: [], letterGaps: [], wordGaps: [] };
  for (const [i, one] of wanted.entries()) {
    (one.dash ? out.dashes : out.dots).push(buffer[i * 2]);
    if (i * 2 + 1 >= buffer.length) break;
    const gap = buffer[i * 2 + 1];
    if (one.gap === 'word') out.wordGaps.push(gap);
    else if (one.gap === 'letter') out.letterGaps.push(gap);
    else out.elementGaps.push(gap);
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * The statistics
 * ------------------------------------------------------------------ */

interface Spread {
  n: number;
  /** the centre, in ms: the geometric mean, because the space is log */
  centre: number;
  /** the width, in log space */
  sd: number;
}

function spread(values: number[]): Spread {
  if (values.length === 0) return { n: 0, centre: 0, sd: 0 };
  const logs = values.map((ms) => Math.log(Math.max(ms, 1)));
  const mean = logs.reduce((a, b) => a + b, 0) / logs.length;
  // the population sd, not the sample one: this is the spread of the durations
  // that were keyed, not an estimate of the spread of a hand behind them
  const variance = logs.reduce((a, b) => a + (b - mean) * (b - mean), 0) / logs.length;
  return { n: values.length, centre: Math.exp(mean), sd: Math.sqrt(variance) };
}

/**
 * How well two classes are told apart: the gap between their centres over how
 * wide they are, both in log space.
 *
 * This is the paper's `d(m,j)/σ` with the classes being adjacent duration
 * classes rather than codewords. Null where one of the two was never keyed —
 * a message with no dash in it has no dot/dash boundary to be difficult about,
 * and calling that infinitely easy or infinitely hard would both be wrong.
 * `decidable` below is where that case is accounted for instead.
 */
function discriminability(low: number[], high: number[]): number | null {
  if (low.length === 0 || high.length === 0) return null;
  const a = spread(low);
  const b = spread(high);
  // pooled, so that one tight class and one loose one is as hard as the loose
  // one makes it
  const pooled = Math.sqrt((a.sd * a.sd * a.n + b.sd * b.sd * b.n) / (a.n + b.n));
  const apart = Math.log(b.centre) - Math.log(a.centre);
  // a hand whose "dashes" are shorter than its dots is not a separation of zero
  // but a separation the wrong way round, and it stays negative here on purpose
  if (pooled === 0) return apart === 0 ? 0 : Infinity * Math.sign(apart);
  return apart / pooled;
}

/** the standard Gaussian tail, Abramowitz & Stegun 7.1.26 — good to 1.5e-7 */
function tail(x: number): number {
  if (x < 0) return 1 - tail(-x);
  const t = 1 / (1 + 0.3275911 * (x / Math.SQRT2));
  const poly = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  return 0.5 * poly * Math.exp(-(x * x) / 2);
}

/**
 * How many of these durations land on the wrong side of the best split between
 * two classes: the error a decoder that knew the answer would still make.
 *
 * The split is chosen by trying every midpoint between two observed durations
 * and keeping the one that misplaces fewest, which is the best any threshold
 * can do on this message. It is the floor under every algorithm in
 * src/lib/morse/ — none of them can read a hand whose own durations contradict
 * each other — and the number that says whether a failure is the decoder's
 * fault or the hand's.
 */
function bayesError(low: number[], high: number[]): number | null {
  if (low.length === 0 || high.length === 0) return null;
  const points = [...low.map((ms) => ({ ms, high: false })), ...high.map((ms) => ({ ms, high: true }))];
  points.sort((a, b) => a.ms - b.ms);

  let best = points.length;
  // every gap between two neighbouring durations is a candidate split, plus the
  // two ends, where one class is called for everything
  for (let cut = 0; cut <= points.length; cut++) {
    let wrong = 0;
    for (const [i, point] of points.entries()) {
      const calledHigh = i >= cut;
      if (calledHigh !== point.high) wrong++;
    }
    best = Math.min(best, wrong);
  }
  return best / points.length;
}

export interface Difficulty {
  /** how many elements were keyed */
  elements: number;

  /** the separation at each of the three boundaries, in pooled log sd */
  dash: number | null;
  letter: number | null;
  word: number | null;

  /**
   * The paper's D: the mean of `sd/separation` over the boundaries this message
   * has. Higher is harder, and — as in the paper — it is comparable across
   * messages, which the per-boundary numbers are not.
   */
  d: number;

  /**
   * The chance a duration is on the wrong side of the boundary, from the
   * Gaussian assumption. The paper's L: a lower bound on any classifier's
   * error, if the classes really were Gaussian.
   */
  predicted: number;

  /** the same thing counted rather than assumed, over the durations actually keyed */
  bayes: number;

  /**
   * Whether the message fixes its own scale, per docs/morse-decoder-spec.md §3.
   * A message of nothing but dashes is not difficult, it is undetermined: no
   * decoder reading timings alone can tell it from the same message in dots, and
   * a set with many of them measures the speed prior rather than the decoder.
   */
  decidable: boolean;

  /** whether anything at all separates the letters: a one-letter message has no gap */
  bounded: boolean;
}

/** what `align` produced, turned into the numbers above */
export function difficulty(classes: Classes): Difficulty {
  const dash = discriminability(classes.dots, classes.dashes);
  const letter = discriminability(classes.elementGaps, classes.letterGaps);
  const word = discriminability(classes.letterGaps, classes.wordGaps);

  const present = [dash, letter, word].filter((one): one is number => one !== null);
  // 1/d', averaged, is sd-over-separation averaged: the paper's D exactly, with
  // their per-class minimum distance replaced by our adjacent boundaries, of
  // which there are only ever three.
  //
  // The floor is not the paper's and is needed: their classes are 64 codewords
  // that never coincide, and two of ours *do* — a hand whose dashes are the
  // length of its dots has a separation of zero, and one whose "dashes" come
  // out shorter has a negative one. Unfloored, a single such message takes a
  // set's mean D to five figures and the metric stops being readable. A quarter
  // of a standard deviation is already an overlap of 45%, so everything at or
  // below it is the same answer — maximally hard — and D tops out at 4.
  const d = present.length === 0 ? 0 : present.reduce((a, b) => a + 1 / Math.max(b, 0.25), 0) / present.length;
  const predicted = present.length === 0 ? 0 : present.reduce((a, b) => a + tail(b / 2), 0) / present.length;

  const errors = [
    bayesError(classes.dots, classes.dashes),
    bayesError(classes.elementGaps, classes.letterGaps),
    bayesError(classes.letterGaps, classes.wordGaps),
  ].filter((one): one is number => one !== null);
  const bayes = errors.length === 0 ? 0 : errors.reduce((a, b) => a + b, 0) / errors.length;

  return {
    elements: classes.dots.length + classes.dashes.length,
    dash,
    letter,
    word,
    d,
    predicted,
    bayes,
    decidable: classes.dots.length > 0 && classes.dashes.length > 0,
    bounded: classes.letterGaps.length > 0 || classes.wordGaps.length > 0,
  };
}

/**
 * The hand behind a message, as its own durations report it.
 *
 * Not a difficulty number but the thing a generator needs: what a real hand's
 * ratios and wobble actually are, so that generated hands can be drawn from the
 * same ranges instead of from the textbook. `test/hands.ts` is calibrated on
 * what this returns for the corpus.
 */
export interface Measured {
  dot: number;
  wpm: number;
  /** in dots */
  dash: number;
  elementGap: number;
  letterGap: number;
  wordGap: number;
  /** the wobble, as a log sd pooled over the presses: `synth.ts`'s jitter is
   * roughly `sd * 1.7`, a uniform band being that much wider than its sd */
  jitter: number;
}

export function measure(classes: Classes): Measured | null {
  const dot = spread(classes.dots);
  if (dot.n === 0) return null;

  const dash = spread(classes.dashes);
  const element = spread(classes.elementGaps);
  const letter = spread(classes.letterGaps);
  const word = spread(classes.wordGaps);

  const presses = [...classes.dots, ...classes.dashes];
  const centres = new Map<number, number>();
  for (const ms of classes.dots) centres.set(ms, dot.centre);
  for (const ms of classes.dashes) centres.set(ms, dash.centre);
  const wobble = Math.sqrt(
    presses.reduce((a, ms) => {
      const off = Math.log(Math.max(ms, 1)) - Math.log(centres.get(ms)!);
      return a + off * off;
    }, 0) / presses.length
  );

  return {
    dot: dot.centre,
    wpm: 1200 / dot.centre,
    dash: dash.n ? dash.centre / dot.centre : 0,
    elementGap: element.n ? element.centre / dot.centre : 0,
    letterGap: letter.n ? letter.centre / dot.centre : 0,
    wordGap: word.n ? word.centre / dot.centre : 0,
    jitter: wobble * 1.7,
  };
}

/** every duration of a message, as one spread: how loose the hand is overall */
export const overall = (classes: Classes): Spread => spread(all(classes));
