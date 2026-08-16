/**
 * The window decoder: cut the window where the clusters are, and keep the cut
 * that makes letters.
 *
 * Every other decoder here works forwards, one element at a time, deciding each
 * press before the elements that would have explained it exist — which is why
 * four dots from a hand that pauses inside its letters read as `eeee` and stay
 * that way. This one reads a window of elements as a group, and is allowed to
 * re-read it: freely for the first `FLICKER_LETTERS` letters of a message,
 * where nobody is reading yet, and after that only inside a sliding window of
 * `HORIZON` letters. What leaves the window is a letter and is never touched
 * again.
 *
 * What it searches is not a speed but three thresholds — which presses are
 * dashes, which silences end a letter, which end a word — because every reading
 * of the window is exactly one choice of those. The candidates come from the
 * window's own durations (`#splits`), which is what lets it follow a hand
 * keying a 60ms dot against a 450ms dash, a ratio no multiple of a dot
 * describes. Each reading is scored on how tight its clusters are, whether the
 * letters that come out are letters in the reader's table, and how far the
 * speed it implies has moved from the hand being tracked (`#read`).
 */

import type { Letter } from './decode';

export type { Letter };

/** how many letters into a message re-reading is allowed */
const FLICKER_LETTERS = 4;

/** how many letters stay in the window after that: the latency, in letters */
const HORIZON = 1;

/** how many frozen elements the window keeps behind the frontier as evidence.
 * Without them a window holding one letter has no idea what a letter gap looks
 * like for this operator. */
const KEEP_EVENTS = 12;

/** the most elements the window holds before it freezes the oldest letter
 * regardless: a runaway window is a decoder that shows nothing */
const MAX_EVENTS = 40;

/** the range a dot estimate is allowed into, in ms: 60wpm to 2wpm */
const MIN_DOT = 20;
const MAX_DOT = 600;

/** the least a dash may be over a dot, and a letter gap over an element gap.
 * Below this it is not two clusters, it is one cluster cut in half. */
const MIN_DASH_RATIO = 1.8;
const MIN_GAP_RATIO = 1.5;

/** what breaking one of those ratios costs */
const SHAPE_COST = 8;

/** what a code that is not in the table costs, per element in it. Per element,
 * because a flat charge is cheapest to pay once and a search scored that way
 * runs the whole window into one unreadable blob. */
const UNKNOWN_COST = 1.2;

/** what a one-element letter costs, and what each one past the second in a row
 * costs on top: `e` and `t` are common, `eee` is a hand being cut up */
const LONE_COST = 0.4;
const LONE_RUN_COST = 2.5;
const LONE_RUN_AT = 2;

/** what a word break costs. Word gaps have no scatter cost — a pause for
 * thought can be any length — so without this every letter is its own word. */
const WORD_COST = 1.2;

/** how hard the running estimate pulls on the search, per element in the
 * window. What stops it re-inventing the hand on every element. */
const PRIOR_COST = 0.8;

/** how far the estimate moves towards the winner, and the most it may move at
 * once */
const ALPHA = 0.4;
const MAX_STEP = 0.25;

/** how many candidate thresholds are taken from each set of durations */
const CANDIDATES = 5;

/** one press or one silence, as it arrived */
interface Event {
  ms: number;
  sound: boolean;
}

/** a letter the search produced, and how many of `#events` it and everything
 * before it consumed. An index, because the frontier is an index too. */
interface Segment extends Letter {
  end: number;
}

/** the three numbers that are one reading of the window */
interface Thresholds {
  /** a press at least this long is a dash */
  dash: number;
  /** a silence at least this long ends the letter */
  letter: number;
  /** a silence at least this long ends the word */
  word: number;
}

/** one candidate's reading of the window, and what it costs */
interface Reading {
  cost: number;
  letters: Segment[];
  /** the elements of the character still being keyed */
  pending: string;
  /** the dot this reading implies: the centre of its dot cluster */
  dot: number;
  thresholds: Thresholds;
}

export interface WindowOptions {
  /** whether a code is a character in the reader's table. Without it the search
   * is only fitting durations. */
  isCharacter: (code: string) => boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
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

export class WindowDecoder {
  /** the letters that have left the window. Nothing here ever changes. */
  letters: Letter[] = [];

  /** the elements not yet frozen, and `#kept` older ones in front of them that
   * are only there to be measured */
  #events: Event[] = [];
  #kept = 0;

  /** how long the key has been up since the last release */
  #idle = 0;

  #reading: Reading;

  /** the hand, as currently understood: one dot, in ms */
  #dot: number;

  /**
   * Whether the message has ever been longer than `FLICKER_LETTERS`. Sticky:
   * a re-reading that merges two letters would otherwise put a long message
   * back under the limit and re-open permission to rewrite it.
   */
  #settled = false;

  readonly #isCharacter: (code: string) => boolean;

  constructor(dot: number, options: WindowOptions) {
    this.#dot = clamp(dot, MIN_DOT, MAX_DOT);
    this.#isCharacter = options.isCharacter;
    this.#reading = this.#empty();
  }

  reset(dot: number) {
    this.#dot = clamp(dot, MIN_DOT, MAX_DOT);
    this.letters = [];
    this.#events = [];
    this.#kept = 0;
    this.#idle = 0;
    this.#settled = false;
    this.#reading = this.#empty();
  }

  #empty(): Reading {
    return {
      cost: 0,
      letters: [],
      pending: '',
      dot: this.#dot,
      thresholds: { dash: this.#dot * 2, letter: this.#dot * 2, word: this.#dot * 5 },
    };
  }

  /** the speed the search currently believes in, as one dot in ms */
  get dot(): number {
    return this.#dot;
  }

  /**
   * The silence after which the current reading would end the character being
   * keyed.
   *
   * A reading can put a threshold at `Infinity` — that is the reading where the
   * class does not occur, and early in a message it is the only candidate there
   * is. Both splits fall back to a multiple of the dot rather than reporting it,
   * because a caller waiting for one of them is waiting with a timer, and a
   * timer set to `Infinity` fires immediately.
   */
  get letterSplit(): number {
    const { letter } = this.#reading.thresholds;
    return Number.isFinite(letter) ? letter : this.#dot * 3;
  }

  /** the silence after which the current reading would end a word: the keyer
   * and the playground use it to know when nothing more is coming */
  get wordSplit(): number {
    const { word } = this.#reading.thresholds;
    return Number.isFinite(word) ? word : this.letterSplit * 3;
  }

  /**
   * The letters still inside the window, drawn as their dots and dashes because
   * they may yet be read differently — plus, once the message is past its
   * flicker budget, nothing else: early on those letters are shown as letters
   * by `visible` instead.
   */
  get preview(): string {
    const codes = this.#settled ? this.#reading.letters.map((l) => l.code) : [];
    if (this.#reading.pending) codes.push(this.#reading.pending);
    return codes.join(' ');
  }

  /** what is on screen as letters: the frozen text, and — early on — the window */
  get visible(): Letter[] {
    return this.#settled ? this.letters : [...this.letters, ...this.#reading.letters];
  }

  addSound(ms: number) {
    this.#events.push({ ms, sound: true });
    this.#idle = 0;
    this.#update(true);
  }

  addSilence(ms: number) {
    // a silence before the first press says nothing about the message
    if (this.#events.length === 0) return;
    this.#events.push({ ms, sound: false });
    this.#idle = 0;
    this.#update(true);
  }

  /**
   * The key has been up for `ms` and is still up: the silence at the end of the
   * window has no measured length, so the search is told how long it has been
   * and closes the last letter once that outlasts a letter gap.
   *
   * It does not learn from this. An idle tick arrives sixty times a second, and
   * letting them move the estimate lets it walk: a second of quiet was once
   * enough to carry a 60ms dot to the 600ms ceiling.
   */
  idle(ms: number) {
    this.#idle = ms;
    this.#update(false);
  }

  /** nothing more is coming: freeze the window as it reads now, or its last
   * letters stay dots and dashes waiting for letters that never arrive */
  flush() {
    this.#update(false);
    this.#freeze(this.#reading.letters.length);
  }

  #update(learn: boolean) {
    this.#reading = this.#best(learn);
    if (this.letters.length + this.#reading.letters.length > FLICKER_LETTERS) {
      this.#settled = true;
    }

    const spare = this.#reading.letters.length - HORIZON;
    if (this.#settled && spare > 0) {
      this.#freeze(spare);
    } else if (this.#events.length > MAX_EVENTS && this.#reading.letters.length > 0) {
      // no letter boundary the search believes in: its best guess beats nothing
      this.#freeze(1);
    }
  }

  /** moves the oldest `count` letters of the window into the frozen text. Their
   * elements stay behind the frontier as evidence — see `KEEP_EVENTS`. */
  #freeze(count: number) {
    const frozen = this.#reading.letters.slice(0, count);
    if (frozen.length === 0) return;
    for (const letter of frozen) {
      this.letters.push({ code: letter.code, wordBreak: letter.wordBreak });
    }

    this.#kept = frozen[frozen.length - 1].end;
    const drop = Math.max(0, this.#kept - KEEP_EVENTS);
    if (drop > 0) {
      this.#events = this.#events.slice(drop);
      this.#kept -= drop;
    }
    // re-read what is left, without learning: this window has already taught
    // the estimate everything it had to say
    this.#reading = this.#best(false);
  }

  /** the cheapest reading of the window. Only new elements may move the running
   * estimate — see `idle`. */
  #best(learn: boolean): Reading {
    if (this.#events.length === 0) return this.#empty();

    // the frozen elements are in the candidate lists too: their reading is
    // fixed, their durations are still this operator's
    const sounds = this.#events.filter((e) => e.sound).map((e) => e.ms);
    const gaps = this.#events.filter((e) => !e.sound).map((e) => e.ms);

    let best: Reading | null = null;
    for (const dash of this.#splits(sounds)) {
      for (const letter of this.#splits(gaps)) {
        for (const word of this.#splits(gaps, letter)) {
          const reading = this.#read({ dash, letter, word });
          if (best === null || reading.cost < best.cost) best = reading;
        }
      }
    }
    if (best === null) return this.#empty();
    if (process.env.DBG) console.log('win', JSON.stringify(best.thresholds), 'letters', best.letters.map(l=>l.code+(l.wordBreak?'|W':'')).join(','));

    if (learn && best.dot > 0) {
      // the estimate follows the winner rather than jumping to it: one window's
      // best fit is one sample of a hand, and the hand is what is being tracked
      const moved = this.#dot + ALPHA * (best.dot - this.#dot);
      const step = clamp(moved, this.#dot * (1 - MAX_STEP), this.#dot * (1 + MAX_STEP));
      this.#dot = clamp(step, MIN_DOT, MAX_DOT);
    }
    return best;
  }

  /**
   * Where a threshold could sensibly go: the widest few jumps between
   * neighbouring durations, which is where a boundary between two clusters is
   * if there is one. `Infinity` is always a candidate — it is the reading where
   * the class does not occur at all.
   *
   * @param above - only splits over this one, for the word threshold, which has
   * to sit above the letter threshold to mean anything
   */
  #splits(values: number[], above = 0): number[] {
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
   * The window, read at one set of thresholds, and what that reading costs: one
   * pass that splits the elements into letters and collects each class of
   * duration as it goes.
   *
   * The elements in front of the frontier are classified too — they are what
   * the clusters are measured from — but not read: their letters have been
   * shown and cannot be decided again.
   */
  #read(thresholds: Thresholds): Reading {
    const letters: Segment[] = [];
    const dots: number[] = [];
    const dashes: number[] = [];
    const elementGaps: number[] = [];
    const letterGaps: number[] = [];

    let cost = 0;
    let code = '';
    let seen = 0;
    let wordBreak = false;
    let loneRun = 0;

    /** close the character being read: what it costs is whether it is a letter
     * at all, and whether it is one of a run of lone elements that used to be */
    const finish = (endsWord: boolean) => {
      if (code) {
        if (!this.#isCharacter(code)) cost += UNKNOWN_COST * code.length;
        if (code.length === 1) cost += loneRun >= LONE_RUN_AT ? LONE_COST + LONE_RUN_COST : LONE_COST;
      }
      if (endsWord) cost += WORD_COST;
      loneRun = code.length === 1 ? loneRun + 1 : 0;
      letters.push({ code, wordBreak, end: seen });
      code = '';
      wordBreak = endsWord;
    };

    for (const event of this.#events) {
      seen++;
      const settled = seen <= this.#kept;

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
      // a word gap is a pause for thought and can be any length, so it joins no
      // cluster and is charged for by the break it makes instead
      if (event.ms < thresholds.word) letterGaps.push(event.ms);
      if (settled) {
        // the gap between the frozen text and the window still decides whether
        // the window starts a new word, and is charged for like any other break
        wordBreak = event.ms >= thresholds.word;
        if (wordBreak) cost += WORD_COST;
        continue;
      }
      finish(event.ms >= thresholds.word);
    }

    // the character at the end: closed if the key has been up longer than this
    // reading calls a letter gap, still being keyed if not
    let pending = code;
    if (code && this.#idle >= thresholds.letter) {
      finish(false);
      pending = '';
    }

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

    // how far the dot this reading implies is from the hand we believe we are
    // reading
    const implied = dots.length ? dot.centre : dash.centre / 3;
    if (implied > 0) {
      const drift = Math.log(implied / this.#dot);
      cost += PRIOR_COST * drift * drift * this.#events.length;
    }

    return { cost, letters, pending, dot: implied, thresholds };
  }
}
