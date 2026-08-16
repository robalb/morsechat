/**
 * The window decoder: cut the window where the clusters are, and keep the cut
 * that makes letters.
 *
 * Every other decoder in lib/morse and lib/playground works forwards, one
 * element at a time: classify the press against the current estimate, commit
 * it, move on. That is what makes them safe — nothing on screen can change —
 * and it is also their ceiling, because each decision is taken at the worst
 * possible moment, before the elements that would have explained it exist. Four
 * dots from a hand that pauses inside its letters read as `eeee` element by
 * element, and no amount of adapting afterwards turns them back into an `h`.
 *
 * This one looks at a window of elements as a group, and it is allowed to be
 * wrong on screen — but only at the very start of a message, where the operator
 * has been told nothing yet and expects nothing. Two rules make that bargain
 * concrete:
 *
 *   - the first `FLICKER_LETTERS` letters of a message may be re-read as often
 *     as the search likes. Nobody is reading a four-letter message yet, and the
 *     speed genuinely is unknown at that point.
 *   - after that the text is frozen behind a sliding window of `HORIZON`
 *     letters. What is inside the window is drawn as the dots and dashes it was
 *     keyed as and is still being re-read; what has left it is a letter and is
 *     never touched again. So a letter is never rewritten once it has been shown
 *     as a letter — the same promise lib/morse/adaptive.ts makes, bought here
 *     with a letter of latency instead of with a worse reading.
 *
 * **What the search searches.** Not a speed: three thresholds. Which presses
 * are dashes, which silences end a letter, and which end a word — every reading
 * of the window is exactly one choice of those three, so trying readings *is*
 * trying thresholds. The candidates come from the window's own durations: sort
 * them, find the widest jumps between neighbours, and put a threshold in each.
 * That is what a fixed 1:3:7 model cannot do, and this corpus needs it — these
 * hands key a 60ms dot against a 450ms dash (1:7, not 1:3) and leave 200ms
 * between two elements of the same letter, which no multiple of their dot will
 * ever describe.
 *
 * Each reading is then scored on three things:
 *
 *   - **how tight the clusters are.** Every press assigned to "dot" should look
 *     like every other one; so should the dashes, the gaps inside letters and
 *     the gaps between them. The cost is the scatter of each group about its own
 *     centre, in log space so that a loose reading of a fast hand costs what the
 *     same looseness costs on a slow one.
 *   - **whether the letters that come out are letters.** `h` beats four `e`s,
 *     and a run of lone elements is charged for as the thing it usually is: one
 *     letter that has been cut into pieces. This is the "prioritise clusters
 *     that make letters" rule, and no decoder that commits one element at a time
 *     can apply it, because it is a property of a group.
 *   - **how far the speed has moved.** Hands drift; they do not double between
 *     two letters. The dot the winner implies is smoothed into a running
 *     estimate, and that estimate pulls on the next search — which is what makes
 *     this a decoder that tracks a hand across a message rather than one that
 *     re-guesses it whenever an element arrives.
 *
 * Nothing here knows about the dialect beyond `isCharacter`, which is how it
 * asks whether a code is a letter in the reader's table.
 */

import type { Letter } from './adaptive';

export type { Letter };

/**
 * How many letters into a message flicker is allowed.
 *
 * The permission this decoder is built on. Four letters is a second or two of
 * keying: long enough for the search to have seen a dash and a letter gap and
 * to have found the hand, short enough that nobody has started reading. From
 * the fifth letter on, this is as strict as anything else here.
 */
const FLICKER_LETTERS = 4;

/**
 * How many letters stay inside the window once flicker is over.
 *
 * This is the latency: a letter appears on screen this many letters after it
 * was keyed. One is enough to be worth having — it is what lets a lone `e` be
 * pulled back into the letter it belongs to when the next gap turns out to be
 * the real letter gap — and each further letter is another letter of delay for
 * a rapidly shrinking gain.
 */
const HORIZON = 1;

/**
 * How many already-frozen elements the window keeps behind the frontier.
 *
 * The frozen letters are off the search's hands, but it still needs something
 * to measure: a window holding one letter's worth of elements has no idea what
 * a letter gap looks like for this operator. These are kept purely as evidence
 * — their reading is settled and cannot change — and they are what lets the
 * thresholds keep moving with the hand.
 */
const KEEP_EVENTS = 12;

/** the most elements the window will hold before it freezes the oldest letter
 * regardless: a runaway window is a decoder that shows nothing */
const MAX_EVENTS = 40;

/** the range a dot estimate is allowed into, in ms: 60wpm to 2wpm */
const MIN_DOT = 20;
const MAX_DOT = 600;

/**
 * The ratios a hand is allowed to key at: a dash against a dot, and a letter
 * gap against a gap inside a letter.
 *
 * Wide, because real hands are — the corpus has dashes at seven dots — but not
 * unbounded, because a "dash" cluster barely longer than the dot cluster is not
 * two clusters at all, it is one cluster cut in half.
 */
const MIN_DASH_RATIO = 1.8;
const MIN_GAP_RATIO = 1.5;

/** what breaking one of those ratios costs. Large: it is not a preference, it
 * is the difference between a reading and a fiction. */
const SHAPE_COST = 8;

/**
 * What a code that is not in the table costs, per element in it.
 *
 * Per element, and not per letter: a flat charge is cheapest to pay once, so a
 * search scored that way runs the whole window together into a single
 * twenty-element non-letter and pays the fee a single time. Charging by the
 * element makes an unreadable blob cost what it actually is.
 */
const UNKNOWN_COST = 1.2;

/** what a one-element letter costs. Small — `e` and `t` are common — but not
 * nothing, because two of them in a row are usually one letter that came
 * apart. */
const LONE_COST = 0.4;

/** and what each lone letter past the second in a row costs. `eee` is not
 * English: three in a row is a hand being cut up, not text. */
const LONE_RUN_COST = 2.5;
const LONE_RUN_AT = 2;

/** what a word break costs. Word gaps are the one class with no scatter cost —
 * a pause for thought can be any length at all — so without this the search
 * would happily read every letter as its own word. */
const WORD_COST = 1.2;

/**
 * How hard the running estimate pulls on the search, per element in the window.
 *
 * What stops the window from re-inventing the hand every time an element
 * arrives. It is charged on the log of the ratio, so speeding up and slowing
 * down cost the same, and it scales with the window because a longer window's
 * scatter costs are correspondingly larger.
 */
const PRIOR_COST = 0.8;

/** how far the estimate moves towards the winner, and the most it may move in
 * one step */
const ALPHA = 0.4;
const MAX_STEP = 0.25;

/** how many candidate thresholds are taken from each set of durations: the
 * widest jumps between neighbouring values, which is where the boundary between
 * two clusters is if there is one */
const CANDIDATES = 5;

/** one press or one silence, as it arrived */
interface Event {
  ms: number;
  sound: boolean;
}

/** a letter the search produced, and where in the window it ends */
interface Segment {
  code: string;
  wordBreak: boolean;
  /**
   * How many of `#events` this letter and everything before it consumed.
   *
   * An index rather than a length, because the frontier between the frozen
   * elements and the window is an index too: a re-reading is free to put a
   * letter boundary somewhere new, and a length would then be counted against a
   * frontier the reading it came from never agreed with.
   */
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
  /** whether a code is a character in the reader's table. The search is built
   * around this question; without it, it is only fitting durations. */
  isCharacter: (code: string) => boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * How spread out a group of durations is about its own centre, in log space.
 *
 * Log space because morse is multiplicative: a dot cluster at 50±10ms and one
 * at 200±40ms are equally tight hands, and a cost in milliseconds would call
 * the slow one four times worse and quietly bias every search towards reading
 * everything fast.
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

  /** the window: the elements not yet frozen, and `#kept` older ones in front
   * of them that are only there to be measured */
  #events: Event[] = [];
  #kept = 0;

  /** how long the key has been up since the last release */
  #idle = 0;

  /** the current best reading of the window */
  #reading: Reading;

  /** the hand, as currently understood: one dot, in ms */
  #dot: number;

  /**
   * Whether the message has ever been longer than `FLICKER_LETTERS`.
   *
   * Sticky, and it has to be: a re-reading that merges two letters into one
   * would otherwise put a message that had grown past the limit back under it
   * and re-open permission to rewrite text the operator has been reading for
   * several seconds. Once flicker is over it is over.
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

  /** the silence after which the current reading would end a word. The
   * playground's idle tick uses it to know when nothing more is coming. */
  get wordSplit(): number {
    const { word, letter } = this.#reading.thresholds;
    return Number.isFinite(word) ? word : letter * 3;
  }

  /** whether the message is still short enough for re-reading to be allowed */
  get flickering(): boolean {
    return !this.#settled;
  }

  /**
   * The letters still inside the window: decided for now, and drawn as their
   * dots and dashes because they may yet be read differently.
   *
   * While the message is still in its first few letters they are drawn as
   * letters instead — that is what `flickering` is — and this returns only the
   * character being keyed.
   */
  get preview(): string {
    const codes = this.flickering ? [] : this.#reading.letters.map((l) => l.code);
    if (this.#reading.pending) codes.push(this.#reading.pending);
    return codes.join(' ');
  }

  /** what is on screen as letters: the frozen text, and — early on — the window */
  get visible(): Letter[] {
    if (!this.flickering) return this.letters;
    return [...this.letters, ...this.#reading.letters];
  }

  /* ---------------------------------------------------------------- *
   * Input
   * ---------------------------------------------------------------- */

  addSound(ms: number) {
    this.#events.push({ ms, sound: true });
    this.#idle = 0;
    this.#update(true);
  }

  addSilence(ms: number) {
    // a silence before the first press of a message says nothing about it
    if (this.#events.length === 0) return;
    this.#events.push({ ms, sound: false });
    this.#idle = 0;
    this.#update(true);
  }

  /**
   * The key has been up for `ms` and is still up.
   *
   * The silence at the end of the window has no measured length — it ends when
   * the next press arrives — so the search is told how long it has been so far
   * and closes the last letter once that outlasts a letter gap.
   *
   * It does not learn from this. Silence is not evidence about the speed, and
   * an idle tick arrives sixty times a second: letting these move the estimate
   * lets it walk. An earlier version did, and a second of quiet at the end of a
   * message was enough to carry a 60ms dot to the 600ms ceiling — one tiny
   * preference, applied two hundred times.
   */
  idle(ms: number) {
    this.#idle = ms;
    this.#update(false);
  }

  /**
   * Nothing more is coming: freeze the window as it reads now.
   *
   * Without this the last letters of a message would stay dots and dashes on
   * screen, waiting for letters that will never be keyed to push them out.
   */
  flush() {
    this.#update(false);
    this.#freeze(this.#reading.letters.length);
  }

  /* ---------------------------------------------------------------- *
   * The search
   * ---------------------------------------------------------------- */

  #update(learn: boolean) {
    this.#reading = this.#best(learn);
    if (this.letters.length + this.#reading.letters.length > FLICKER_LETTERS) {
      this.#settled = true;
    }

    const spare = this.#reading.letters.length - HORIZON;
    if (this.#settled && spare > 0) {
      this.#freeze(spare);
    } else if (this.#events.length > MAX_EVENTS && this.#reading.letters.length > 0) {
      // the search has found no letter boundary it believes in. Showing its
      // best guess is better than showing nothing at all.
      this.#freeze(1);
    }
  }

  /**
   * Moves the oldest `count` letters of the window into the frozen text.
   *
   * Their elements stay in `#events` as evidence — see `KEEP_EVENTS` — but they
   * are behind the frontier now, and what is behind the frontier is settled.
   */
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
    // re-read what is left, without learning from it: this window has already
    // taught the estimate everything it had to say
    this.#reading = this.#best(false);
  }

  /**
   * The cheapest reading of the window.
   *
   * @param learn - whether the winner may move the running estimate. Only new
   * elements teach; see `idle`.
   */
  #best(learn: boolean): Reading {
    if (this.#events.length === 0) return this.#empty();

    // the settled elements are in the candidate lists too: their reading is
    // fixed, but their durations are still this operator's durations
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

    if (learn && best.dot > 0) {
      // the estimate follows the winner rather than jumping to it: one window's
      // best fit is one sample of a hand, and the hand is what is being tracked
      const moved = this.#dot + ALPHA * (best.dot - this.#dot);
      this.#dot = clamp(
        clamp(moved, this.#dot * (1 - MAX_STEP), this.#dot * (1 + MAX_STEP)),
        MIN_DOT,
        MAX_DOT
      );
    }
    return best;
  }

  /**
   * Where a threshold could sensibly go, given a set of durations.
   *
   * Sort them and look at the ratios between neighbours: a boundary between two
   * kinds of thing shows up as a wide jump, and the widest few jumps are the
   * only places worth trying. `Infinity` is always a candidate — it is the
   * reading where the class does not occur at all, a window of pure dots or a
   * message with no gap in it long enough to end a word.
   *
   * @param above - only consider splits above this one, for the word threshold,
   * which has to sit above the letter threshold to mean anything
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
   * The window, read at one set of thresholds, and what that reading costs.
   *
   * The thresholds decide everything, so this is a single pass: split the
   * elements into letters, collect each class of duration as it goes, and add
   * up what the reading costs at the end.
   *
   * The elements in front of the frontier are read too — their letters are
   * already frozen and are dropped at the end — because they are what the
   * clusters are measured from.
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

    const finish = (endsWord: boolean) => {
      cost += this.#letterCost(code, loneRun);
      if (endsWord) cost += WORD_COST;
      loneRun = code.length === 1 ? loneRun + 1 : 0;
      letters.push({ code, wordBreak, end: seen });
      code = '';
      wordBreak = endsWord;
    };

    for (const event of this.#events) {
      seen++;
      // Everything in front of the frontier is settled text. It is classified,
      // because it is the evidence the clusters are measured from — a window
      // holding one letter has no idea what this operator's letter gap looks
      // like — but it is not read: its letters have been shown and cannot be
      // decided again, and a reading that re-segmented them would emit them a
      // second time.
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
      // A word gap is a pause for thought and can be any length at all, so it
      // joins no cluster and is charged for by the break it makes instead.
      if (event.ms < thresholds.word) letterGaps.push(event.ms);
      if (settled) {
        // the gap that separates the settled text from the window still decides
        // whether the window starts a new word, and it is charged for like any
        // other word break — otherwise the one break the search never pays for
        // is the one it makes on every window
        wordBreak = event.ms >= thresholds.word;
        if (wordBreak) cost += WORD_COST;
        continue;
      }
      finish(event.ms >= thresholds.word);
    }

    // The character at the end: closed if the key has been up longer than this
    // reading calls a letter gap, still being keyed if not.
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

    // Two clusters, or one cluster cut in half? A dash barely longer than a dot
    // is the second, and so is a letter gap barely longer than the gaps inside
    // a letter.
    if (dashes.length && dots.length && dash.centre < dot.centre * MIN_DASH_RATIO) {
      cost += SHAPE_COST;
    }
    if (letterGaps.length && elementGaps.length && letter.centre < element.centre * MIN_GAP_RATIO) {
      cost += SHAPE_COST;
    }

    // the dot this reading implies, and how far that is from the hand we
    // believe we are reading
    const implied = dots.length ? dot.centre : dash.centre / 3;
    if (implied > 0) {
      const drift = Math.log(implied / this.#dot);
      cost += PRIOR_COST * drift * drift * this.#events.length;
    }

    return { cost, letters, pending, dot: implied, thresholds };
  }

  /** what a finished letter costs: whether it is a letter at all, and whether
   * it is one of a run of lone elements that used to be one */
  #letterCost(code: string, loneRun: number): number {
    if (!code) return 0;
    let cost = this.#isCharacter(code) ? 0 : UNKNOWN_COST * code.length;
    if (code.length === 1) {
      cost += LONE_COST;
      if (loneRun >= LONE_RUN_AT) cost += LONE_RUN_COST;
    }
    return cost;
  }
}
