/**
 * The decoding algorithm: a run of key durations, read as morse.
 *
 * One reading of a run of durations is exactly one choice of three thresholds —
 * which presses are dashes, which silences end a letter, which end a word. The
 * candidates for each are taken from the durations themselves (`splits`), which
 * is what lets it follow a hand keying a 60ms dot against a 450ms dash, a ratio
 * no multiple of a dot describes. `read` reads the elements at one such triple
 * and prices the result; `search` tries every combination and keeps the cheapest.
 *
 * A reading is priced on how tightly each class of duration clusters about its
 * own centre (`scatter`), on whether those clusters look like morse
 * (`shapeCost`), and on whether the characters that come out are characters
 * (`characterCost`).
 *
 * It is used two ways, and `read`'s options are what they differ by:
 *
 *   - ./window.ts — dynamic: a sliding window of the last few elements, re-read
 *     after every press while the operator is still keying.
 *   - ./window-static.ts — static: the whole message, read once, after.
 */

/** whether a code is a character in the reader's table */
export type IsCharacter = (code: string) => boolean;

export interface WindowOptions {
  isCharacter: IsCharacter;
}

/** the three numbers that are one reading */
export interface Thresholds {
  /** a press at least this long is a dash */
  dash: number;
  /** a silence at least this long ends the letter */
  letter: number;
  /** a silence at least this long ends the word */
  word: number;
}

/** how many candidate thresholds are taken from each set of durations */
const CANDIDATES = 5;

/** the least a dash may be over a dot, and a letter gap over an element gap.
 * Below this it is not two clusters, it is one cluster cut in half. */
const MIN_DASH_RATIO = 1.8;
const MIN_GAP_RATIO = 1.5;

/** what breaking one of those ratios costs */
const SHAPE_COST = 8;

/** what a code that is not in the table costs, per element in it. Per element,
 * because a flat charge is cheapest to pay once and a search scored that way
 * runs everything it reads into one unreadable blob. */
const UNKNOWN_COST = 1.2;

/** what a one-element letter costs, and what each one past the second in a row
 * costs on top: `e` and `t` are common, `eee` is a hand being cut up */
const LONE_COST = 0.4;
const LONE_RUN_COST = 2.5;
const LONE_RUN_AT = 2;

/** one class of duration, as the search measures it */
export interface Cluster {
  count: number;
  cost: number;
  centre: number;
}

/**
 * How spread out a group of durations is about its own centre, in log space —
 * morse is multiplicative, and a cost in ms would call a slow hand four times
 * looser than an equally tight fast one.
 */
export function scatter(values: number[]): Cluster {
  if (values.length === 0) return { count: 0, cost: 0, centre: 0 };
  const logs = values.map((ms) => Math.log(Math.max(ms, 1)));
  const mean = logs.reduce((a, b) => a + b, 0) / logs.length;
  const cost = logs.reduce((sum, x) => sum + (x - mean) * (x - mean), 0);
  return { count: values.length, cost, centre: Math.exp(mean) };
}

/**
 * Where a threshold could sensibly go: the widest few jumps between neighbouring
 * durations, which is where a boundary between two clusters is if there is one.
 * `Infinity` is always a candidate — the reading where the class does not occur
 * at all, which is what reads a message of pure dots, or one with no word break.
 *
 * @param above - only splits over this one, for the word threshold, which has to
 * sit above the letter threshold to mean anything
 */
export function splits(values: number[], above = 0): number[] {
  const sorted = [...values].filter((ms) => ms > above).sort((a, b) => a - b);
  const out = [Infinity];
  if (sorted.length < 2) return out;

  const jumps: { at: number; ratio: number }[] = [];
  for (let i = 1; i < sorted.length; i++) {
    jumps.push({
      // geometric midpoint: the boundary between two multiplicative clusters
      at: Math.sqrt(sorted[i - 1] * sorted[i]),
      ratio: sorted[i] / sorted[i - 1],
    });
  }
  jumps.sort((a, b) => b.ratio - a.ratio);
  for (const jump of jumps.slice(0, CANDIDATES)) {
    if (jump.ratio > 1.05) out.push(jump.at);
  }
  return out;
}

/**
 * Every reading of one run of durations, scored, cheapest kept.
 *
 * @param sounds - the presses, which the dash threshold is drawn from
 * @param gaps - the silences, which both gap thresholds are drawn from
 * @param read - reads the durations at one set of thresholds and prices it
 * @returns the cheapest reading, or null if there was nothing to read
 */
export function search<Reading extends { cost: number }>(
  sounds: number[],
  gaps: number[],
  read: (thresholds: Thresholds) => Reading
): Reading | null {
  let best: Reading | null = null;
  for (const dash of splits(sounds)) {
    for (const letter of splits(gaps)) {
      for (const word of splits(gaps, letter)) {
        const reading = read({ dash, letter, word });
        if (best === null || reading.cost < best.cost) best = reading;
      }
    }
  }
  return best;
}

/**
 * What closing a character costs: whether it is a character at all, and whether
 * it is one of a run of lone elements.
 *
 * @param loneRun - how many one-element characters closed immediately before it
 */
function characterCost(code: string, loneRun: number, isCharacter: IsCharacter): number {
  let cost = 0;
  if (!isCharacter(code)) cost += UNKNOWN_COST * code.length;
  if (code.length === 1) cost += loneRun >= LONE_RUN_AT ? LONE_COST + LONE_RUN_COST : LONE_COST;
  return cost;
}

/**
 * What the shape of a reading costs: a threshold that splits one cluster in two
 * makes both halves tighter than the whole, so a search scored on scatter alone
 * is happy to cut a hand's dots in half and call the top of them dashes.
 *
 * A class nobody keyed is not a loose one, so each charge needs both of its
 * classes to be occupied.
 */
function shapeCost(dots: Cluster, dashes: Cluster, elementGaps: Cluster, letterGaps: Cluster): number {
  let cost = 0;
  if (dashes.count && dots.count && dashes.centre < dots.centre * MIN_DASH_RATIO) {
    cost += SHAPE_COST;
  }
  if (letterGaps.count && elementGaps.count && letterGaps.centre < elementGaps.centre * MIN_GAP_RATIO) {
    cost += SHAPE_COST;
  }
  return cost;
}

/** one press or one silence, as it was keyed */
export interface KeyEvent {
  ms: number;
  sound: boolean;
}

/** a character a reading produced */
export interface Segment {
  /** its dots and dashes, empty where the reading closed a character with no
   * elements in it */
  code: string;
  /** whether the silence before it ended a word */
  wordBreak: boolean;
  /** how many events it and everything before it consumed: an index, because
   * the dynamic decoder's frontier is one */
  end: number;
}

export interface ReadOptions {
  isCharacter: IsCharacter;
  /** what a word break costs: the one number the two decoders disagree on */
  wordCost: number;
  /**
   * Whether the gaps above the word threshold are measured as a cluster. Only
   * true for a finished message: mid-message a long silence is an operator who
   * stopped to think and can be any length, so charging a reading for its
   * scatter would be scoring their attention.
   */
  measureWordGaps?: boolean;
  /**
   * How many leading events are already committed. Their durations are still
   * measured — they are the evidence for this operator's clusters — but the
   * characters they make have been shown, so they are not re-read.
   */
  frozen?: number;
  /**
   * How long the key has been up at the end of the events. The last character is
   * left pending unless this outlasts the reading's own letter gap; a finished
   * message passes `Infinity`, because no press is coming.
   */
  idle?: number;
}

export interface Reading {
  cost: number;
  letters: Segment[];
  /** the elements of the character still being keyed, if any */
  pending: string;
  /** the dot this reading implies: the centre of its dot cluster */
  dot: number;
  thresholds: Thresholds;
}

/**
 * One run of events, read at one set of thresholds: a single pass that cuts the
 * elements into characters and collects each class of duration as it goes.
 *
 * The cost it returns is everything except the drift from a previously believed
 * speed, which only exists while a hand is being tracked: window.ts adds that
 * itself, from `dot`.
 */
export function read(events: KeyEvent[], thresholds: Thresholds, options: ReadOptions): Reading {
  const { isCharacter, wordCost, measureWordGaps = false, frozen = 0, idle = Infinity } = options;

  const letters: Segment[] = [];
  const dots: number[] = [];
  const dashes: number[] = [];
  const elementGaps: number[] = [];
  const letterGaps: number[] = [];
  const wordGaps: number[] = [];

  let cost = 0;
  let code = '';
  let seen = 0;
  let wordBreak = false;
  let loneRun = 0;
  /** a break with nothing in front of it breaks nothing, and is not charged for */
  let anything = frozen > 0;

  const finish = (endsWord: boolean) => {
    if (code) {
      cost += characterCost(code, loneRun, isCharacter);
      anything = true;
    }
    if (endsWord && anything) cost += wordCost;
    loneRun = code.length === 1 ? loneRun + 1 : 0;
    letters.push({ code, wordBreak, end: seen });
    code = '';
    wordBreak = endsWord;
  };

  for (const event of events) {
    seen++;
    // an event in front of the frontier is measured, but not read
    const settled = seen <= frozen;

    if (event.sound) {
      const dash = event.ms >= thresholds.dash;
      (dash ? dashes : dots).push(event.ms);
      if (!settled) code += dash ? '-' : '.';
      continue;
    }

    if (event.ms < thresholds.letter) {
      elementGaps.push(event.ms);
      continue;
    }
    if (event.ms < thresholds.word) letterGaps.push(event.ms);
    else if (measureWordGaps) wordGaps.push(event.ms);

    if (settled) {
      // the gap between what has been shown and what has not still decides
      // whether what follows starts a new word
      wordBreak = event.ms >= thresholds.word;
      if (wordBreak) cost += wordCost;
      continue;
    }
    finish(event.ms >= thresholds.word);
  }

  let pending = code;
  if (code && idle >= thresholds.letter) {
    finish(false);
    pending = '';
  }

  const dot = scatter(dots);
  const dash = scatter(dashes);
  const element = scatter(elementGaps);
  const letter = scatter(letterGaps);
  const word = scatter(wordGaps);
  cost += dot.cost + dash.cost + element.cost + letter.cost + word.cost;
  cost += shapeCost(dot, dash, element, letter);

  // a reading with no dots in it still implies a speed, out of its dashes
  const implied = dots.length ? dot.centre : dash.centre / 3;

  return { cost, letters, pending, dot: implied, thresholds };
}
