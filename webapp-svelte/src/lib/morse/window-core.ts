/**
 * The window search itself, with neither delivery attached.
 *
 * ./window.ts reads a hand while it is keying and ./window-static.ts reads a
 * message that is over, and the difference between them is entirely one of
 * delivery: what is allowed to change on screen, whether there is a "yet", how
 * much of the message the search is allowed to see. The search they deliver is
 * the same one, and it lives here.
 *
 * What that search is: a reading of a run of durations is exactly one choice of
 * three thresholds — which presses are dashes, which silences end a letter,
 * which end a word. The candidates for those come from the durations themselves
 * (`splits`), which is what lets it follow a hand keying a 60ms dot against a
 * 450ms dash, a ratio no multiple of a dot describes. Every combination is read
 * and scored (`search`), and the cheapest reading wins.
 *
 * The scoring is shared down to the constants, with one exception on each side,
 * and both exceptions are about word gaps:
 *
 *   - `WORD_COST` lives in the two callers, because it is worth eight times more
 *     to the live decoder than to the static one. See the comment on either.
 *   - the word-gap *cluster* is measured only by the static decoder, for the
 *     same reason: mid-message a long silence is an operator who stopped to
 *     think, and charging them scatter for it would be scoring their attention.
 *
 * Everything else — the log-space scatter, the shape ratios, the charge for a
 * code that is not a letter, the charge for a run of lone elements — is here and
 * is used by both. A constant tuned against the corpus in one file and not the
 * other is the failure mode this file exists to prevent.
 */

/** whether a code is a character in the reader's table. Without it the search is
 * only fitting durations. */
export type IsCharacter = (code: string) => boolean;

/** what either decoder needs to be told beyond the durations */
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
export const CANDIDATES = 5;

/** the least a dash may be over a dot, and a letter gap over an element gap.
 * Below this it is not two clusters, it is one cluster cut in half. */
export const MIN_DASH_RATIO = 1.8;
export const MIN_GAP_RATIO = 1.5;

/** what breaking one of those ratios costs */
export const SHAPE_COST = 8;

/** what a code that is not in the table costs, per element in it. Per element,
 * because a flat charge is cheapest to pay once and a search scored that way
 * runs everything it is reading into one unreadable blob. */
export const UNKNOWN_COST = 1.2;

/** what a one-element letter costs, and what each one past the second in a row
 * costs on top: `e` and `t` are common, `eee` is a hand being cut up */
export const LONE_COST = 0.4;
export const LONE_RUN_COST = 2.5;
export const LONE_RUN_AT = 2;

/** one class of duration, as the search measures it */
export interface Cluster {
  /** how many durations fell into it: an empty class is not a loose one */
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
 * `Infinity` is always a candidate — it is the reading where the class does not
 * occur at all, which is what reads a message of pure dots, or one with no word
 * break in it, and early in a live message it is the only candidate there is.
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
 * Every reading of one run of durations, scored: the whole search, minus what a
 * reading is, which is the one thing the two decoders do differently.
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
 * What closing a character costs: whether it is a letter at all, and whether it
 * is one of a run of lone elements that used to be.
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
 * is happy to cut a hand's dots in half and call the top of them dashes. These
 * two charges are what says that is not what dots and dashes look like.
 *
 * A class nobody keyed is not a loose one — a message of pure dots pays nothing
 * here — so each charge needs both of its classes to be occupied.
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

/** a character the search produced, and how many events it and everything
 * before it consumed. An index, because the live decoder's frontier is one. */
export interface Segment {
  /** its dots and dashes. Empty where a reading closed a character that had no
   * elements in it — the live decoder draws those as the gap they were. */
  code: string;
  /** whether the silence before it ended a word */
  wordBreak: boolean;
  end: number;
}

/** what a reading needs to know beyond the durations and the thresholds */
export interface ReadOptions {
  isCharacter: IsCharacter;
  /** what a word break costs. The one number the two decoders disagree on: see
   * the `WORD_COST` in either of them. */
  wordCost: number;
  /**
   * Whether the gaps above the word threshold are measured as a cluster.
   *
   * Only true for a message that is over. Mid-message a long silence is an
   * operator who stopped to think and can be any length, so charging a reading
   * for its scatter would be scoring their attention; in a finished message
   * those gaps were mostly keyed and sit in a band like the other classes.
   */
  measureWordGaps?: boolean;
  /**
   * How many leading events are already committed. Their durations are still
   * measured — they are the evidence for what this operator's clusters look
   * like — but the characters they make have been shown and cannot be decided
   * again, so they are not re-read.
   */
  frozen?: number;
  /**
   * How long the key has been up at the end of the events. A character is left
   * pending unless this outlasts the reading's own letter gap; a finished
   * message passes `Infinity`, because no press is coming.
   */
  idle?: number;
}

/** one reading of a run of events, and what it costs */
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
 * One run of events, read at one set of thresholds, and what that reading
 * costs: a single pass that cuts the elements into characters and collects each
 * class of duration as it goes.
 *
 * This is the whole algorithm. Everything either decoder does around it — the
 * window, the frontier, the running estimate of the hand, the rendering — is
 * about *which* events get read and what is done with the answer, not about how
 * a run of durations becomes letters.
 *
 * What it charges for:
 *
 *   - the scatter of each class of duration about its own centre, which is what
 *     says a reading found real clusters rather than cut one in half
 *   - the shape those clusters make (`shapeCost`)
 *   - each character that is not in the reader's table, and each run of lone
 *     elements (`characterCost`)
 *   - each word break, at the caller's price
 *
 * It does not charge for the drift from a previously believed speed: there is
 * no such thing here. The live decoder adds that itself, from `dot`.
 */
export function read(events: KeyEvent[], thresholds: Thresholds, options: ReadOptions): Reading {
  const { isCharacter, wordCost, measureWordGaps = false, frozen = 0, idle = Infinity } = options;

  const letters: Segment[] = [];
  const dots: number[] = [];
  const dashes: number[] = [];
  const elementGaps: number[] = [];
  const wordGaps: number[] = [];
  const letterGaps: number[] = [];

  let cost = 0;
  let code = '';
  let seen = 0;
  let wordBreak = false;
  let loneRun = 0;
  /** whether anything at all precedes the break being closed: a break with
   * nothing in front of it breaks nothing, and is not charged for */
  let anything = frozen > 0;

  /** close the character being read */
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
      // whether the window starts a new word, and is charged for like any break
      wordBreak = event.ms >= thresholds.word;
      if (wordBreak) cost += wordCost;
      continue;
    }
    finish(event.ms >= thresholds.word);
  }

  // the character at the end: closed if the key has been up longer than this
  // reading calls a letter gap, still being keyed if not
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
