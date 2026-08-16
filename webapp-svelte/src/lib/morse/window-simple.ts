/**
 * The window decoder, for a message that has already been keyed.
 *
 * ./window.ts reads a hand while it is keying: it has to show something after
 * every element, may never contradict a letter it has already shown, and cannot
 * see the elements that have not been keyed yet. Almost everything in that file
 * is one of those three problems. This is the same search with all three gone —
 * the message arrives complete, nothing is on screen to be contradicted, and
 * there is no "yet" — which leaves one function.
 *
 * What went, and why it was only ever there for the live case:
 *
 *   - **the window.** The frontier, the frozen letters, `KEEP_EVENTS`,
 *     `MAX_EVENTS`, `HORIZON`, `FLICKER_LETTERS`, `#settled` — all of it exists
 *     to decide which letters are still allowed to change. Here every letter is
 *     decided once, from the whole message, so the window is the message.
 *   - **the idle tick and the pending character.** A live decoder does not know
 *     whether the last character is finished, because the silence after it has
 *     no length until the next press. Here there is no next press: the last
 *     character is finished by definition.
 *   - **the running dot estimate**, and with it `PRIOR_COST`, `ALPHA`,
 *     `MAX_STEP` and the dot clamps. The prior is what stops a window of a dozen
 *     elements re-inventing the operator's speed on every element; a whole
 *     message has enough durations in it to be read on its own evidence, and
 *     there is no previous window for it to be pulled towards.
 *
 * What stays is the search itself, because that is the algorithm and not the
 * delivery: three thresholds — which presses are dashes, which silences end a
 * letter, which end a word — taken from the message's own durations, and scored
 * on how tight the clusters they make are, whether the letters that come out are
 * letters, and how plausible the shape of the result is.
 *
 * The one thing this loses against the live decoder is drift. window.ts
 * re-searches every window, so a hand that speeds up across a message is read at
 * whatever speed it is going at; here one set of thresholds is fitted to the
 * whole thing, and a hand whose dots end up longer than its early dashes cannot
 * be read by any single set. That is the trade for having no state at all.
 */

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
 * runs the whole message into one unreadable blob. */
const UNKNOWN_COST = 1.2;

/** what a one-element letter costs, and what each one past the second in a row
 * costs on top: `e` and `t` are common, `eee` is a hand being cut up */
const LONE_COST = 0.4;
const LONE_RUN_COST = 2.5;
const LONE_RUN_AT = 2;

/** what a word break costs. Word gaps have no scatter cost — a pause for
 * thought can be any length — so without this every letter is its own word. */
const WORD_COST = 1.2;

/** the token a word break is written as, between the codes on either side of it */
const WORD_BREAK = '/';

export interface SimpleWindowOptions {
  /** whether a code is a character in the reader's table. Without it the search
   * is only fitting durations. */
  isCharacter: (code: string) => boolean;
}

/** the three numbers that are one reading of the message */
interface Thresholds {
  /** a press at least this long is a dash */
  dash: number;
  /** a silence at least this long ends the letter */
  letter: number;
  /** a silence at least this long ends the word */
  word: number;
}

/**
 * How spread out a group of durations is about its own centre, in log space —
 * morse is multiplicative, and a cost in ms would call a slow hand four times
 * looser than an equally tight fast one.
 */
function scatter(values: number[]): { cost: number; centre: number } {
  if (values.length === 0) return { cost: 0, centre: 0 };
  const logs = values.map((ms) => Math.log(Math.max(ms, 1)));
  const mean = logs.reduce((a, b) => a + b, 0) / logs.length;
  const cost = logs.reduce((sum, x) => sum + (x - mean) * (x - mean), 0);
  return { cost, centre: Math.exp(mean) };
}

/**
 * Where a threshold could sensibly go: the widest few jumps between neighbouring
 * durations, which is where a boundary between two clusters is if there is one.
 * `Infinity` is always a candidate — it is the reading where the class does not
 * occur at all, which is what reads a message of pure dots, or one with no word
 * break in it.
 *
 * @param above - only splits over this one, for the word threshold, which has to
 * sit above the letter threshold to mean anything
 */
function splits(values: number[], above = 0): number[] {
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

/** one reading of the message, and what it costs */
interface Reading {
  cost: number;
  /** the codes, separated by ' ', with a `/` token between words */
  text: string;
}

/**
 * The message, read at one set of thresholds, and what that reading costs: one
 * pass that splits the elements into letters and collects each class of duration
 * as it goes.
 */
function read(buffer: number[], thresholds: Thresholds, isCharacter: (code: string) => boolean): Reading {
  const dots: number[] = [];
  const dashes: number[] = [];
  const elementGaps: number[] = [];
  const letterGaps: number[] = [];

  const out: string[] = [];
  let cost = 0;
  let code = '';
  let loneRun = 0;

  /** close the character being read: what it costs is whether it is a letter at
   * all, and whether it is one of a run of lone elements that used to be */
  const finish = (endsWord: boolean) => {
    if (code) {
      if (!isCharacter(code)) cost += UNKNOWN_COST * code.length;
      if (code.length === 1) cost += loneRun >= LONE_RUN_AT ? LONE_COST + LONE_RUN_COST : LONE_COST;
      loneRun = code.length === 1 ? loneRun + 1 : 0;
      out.push(code);
      code = '';
    }
    // a break with nothing before it breaks nothing, and is not charged for
    if (endsWord && out.length > 0) {
      cost += WORD_COST;
      out.push(WORD_BREAK);
    }
  };

  // the even entries are presses and the odd ones the silences after them, which
  // is the convention the whole app records in
  for (let i = 0; i < buffer.length; i++) {
    const ms = buffer[i];

    if (i % 2 === 0) {
      const dash = ms >= thresholds.dash;
      (dash ? dashes : dots).push(ms);
      code += dash ? '-' : '.';
      continue;
    }

    if (ms < thresholds.letter) {
      elementGaps.push(ms);
      continue;
    }
    // a word gap is a pause for thought and can be any length, so it joins no
    // cluster and is charged for by the break it makes instead
    if (ms < thresholds.word) letterGaps.push(ms);
    finish(ms >= thresholds.word);
  }
  // the character at the end. Unlike the live decoder there is nothing to wait
  // for: no press is coming, so it is finished.
  finish(false);

  const dot = scatter(dots);
  const dash = scatter(dashes);
  const element = scatter(elementGaps);
  const letter = scatter(letterGaps);
  cost += dot.cost + dash.cost + element.cost + letter.cost;

  if (dashes.length && dots.length && dash.centre < dot.centre * MIN_DASH_RATIO) {
    cost += SHAPE_COST;
  }
  if (letterGaps.length && elementGaps.length && letter.centre < element.centre * MIN_GAP_RATIO) {
    cost += SHAPE_COST;
  }

  // a trailing break is the silence after the message, not a word in it
  while (out.length > 0 && out[out.length - 1] === WORD_BREAK) out.pop();

  return { cost, text: out.join(' ') };
}

/**
 * A finished message, read as dots, dashes and the breaks between them.
 *
 * @param buffer - alternating key-down and key-up durations in ms, starting with
 * a key-down: the array the chat sends over the websocket and the playground
 * records, complete.
 * @returns the codes, separated by ' ', with a `/` between words — e.g.
 * `".... . .-.. .-.. --- / .-- --- .-. .-.. -.."`. Codes rather than text
 * because which letters those are is the dialect's business
 * (`lib/morse/decode.ts`), not the decoder's, and the caller may want to show
 * either.
 */
export function decodeTimings(buffer: number[], options: SimpleWindowOptions): string {
  if (buffer.length === 0) return '';

  const sounds = buffer.filter((_, i) => i % 2 === 0);
  const gaps = buffer.filter((_, i) => i % 2 === 1);

  let best: Reading | null = null;
  for (const dash of splits(sounds)) {
    for (const letter of splits(gaps)) {
      for (const word of splits(gaps, letter)) {
        const reading = read(buffer, { dash, letter, word }, options.isCharacter);
        if (best === null || reading.cost < best.cost) best = reading;
      }
    }
  }
  return best === null ? '' : best.text;
}
