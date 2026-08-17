/**
 * The decoder: key durations, read as morse at one fitted scale.
 *
 * Morse has one free number in it — the dot — and everything else is a ratio to
 * it. So a reading here is exactly that: a *scale*, which is one dot length plus
 * where this particular hand puts its three boundaries (dot/dash, element
 * gap/letter gap, letter gap/word gap), each as a multiple of that dot. The
 * decoder tries every scale in `units` × `SHAPES`, reads the durations at each
 * one, prices the result, and keeps the cheapest.
 *
 * The point of scale-and-shape rather than three loose thresholds is that every
 * candidate is a coherent reading of some real hand. A shape says "dashes start
 * at 1.7 dots, letters break at 3, words at 7"; there is no candidate that says
 * "no press is ever a dash, but silences break into letters at 139ms", which is
 * the kind of answer an unconstrained search returns and then has to be talked
 * out of.
 *
 * A reading is priced on how tightly each class of duration clusters about its
 * own centre (`cluster`), on whether those clusters look like morse
 * (`SHAPE_COST`), on whether the characters that come out are characters
 * (`UNKNOWN_COST`), and — when there is one — on how far the dot it implies is
 * from the speed the caller already believed in (`PRIOR_COST`). That last one is
 * the only thing that can read a message of nothing but dashes, since `m` and
 * `i` are the same durations at different speeds.
 *
 * The one thing weighted rather than counted is the past: a duration whose
 * character has already been shown counts for `COMMITTED_WEIGHT` of one being
 * keyed now. An operator who starts fast and slows down is then followed rather
 * than argued with, which a reading that weighs both halves of the message
 * equally cannot do — it can only explain the new, longer presses as dashes of
 * the old speed.
 *
 * Two ways in, sharing all of the above:
 *
 *   - `decodeTimings` — a finished buffer, read once, with the whole message as
 *     evidence. What the server and a replay want.
 *   - `ScaleDecoder` — the key, read as it is being pressed, for the preview
 *     under the chat. Same fit, run over the tail of the message, plus a rule
 *     for when a character stops being editable.
 */

import type { Letter } from './decode';

export type { Letter };

/** whether a code is a character in the reader's table */
export type IsCharacter = (code: string) => boolean;

export interface ScaleOptions {
  isCharacter: IsCharacter;
}

/* ------------------------------------------------------------------ *
 * What a reading is made of
 * ------------------------------------------------------------------ */

/** one press or one silence, as it was keyed */
interface KeyEvent {
  ms: number;
  sound: boolean;
}

/** where a hand puts its boundaries, in dots */
interface Shape {
  /** a press of at least this many dots is a dash */
  dash: number;
  /** a silence of at least this many dots ends the character */
  letter: number;
  /** a silence of at least this many dots ends the word */
  word: number;
}

/** one shape at one speed: where its three boundaries fall, in ms */
interface Scale {
  /** one dot */
  unit: number;
  /** a press at least this long is a dash */
  dash: number;
  /** a silence at least this long ends the character */
  letter: number;
  /** a silence at least this long ends the word */
  word: number;
}

/** a character a reading produced */
interface Character extends Letter {
  /** how many events it and everything before it consumed: an index, because
   * the live decoder's frontier is one */
  end: number;
}

interface Reading {
  cost: number;
  letters: Character[];
  /** the elements of the character still being keyed, if any */
  pending: string;
  /** the dot this reading measured, in ms: the centre of its dot cluster */
  dot: number;
  /**
   * Whether it saw both a dot and a dash, and so fixed the scale by itself
   * rather than by being told (§3 of docs/morse-decoder-spec.md). Only a reading
   * with contrast in it has measured anything, and only a reading that has
   * measured something may move the estimate — R5.
   */
  contrast: boolean;
  scale: Scale;
}

/* ------------------------------------------------------------------ *
 * The candidates
 * ------------------------------------------------------------------ */

/**
 * The shapes a hand is fitted to.
 *
 * Textbook morse is a 3-dot dash with 1/3/7 gaps, which is the first row, and
 * almost nothing is textbook: the corpus has hands with 7-dot dashes, element
 * gaps as long as the book's letter gap, and letter gaps of five or six. A
 * boundary only has to land between two clusters, so a handful of positions
 * covers every hand in the corpus and in test/synth.ts — but which handful is
 * for the fit to decide, not for this file to assume.
 */
const DASH_AT = [1.7, 2.6];
const LETTER_AT = [2, 3, 4.2];
const WORD_AT = [4.5, 7, 10.5];

const SHAPES: Shape[] = DASH_AT.flatMap((dash) =>
  LETTER_AT.flatMap((letter) => WORD_AT.map((word) => ({ dash, letter, word })))
);

/** what a hand is assumed to be doing before it has keyed anything */
const TEXTBOOK = SHAPES[0];

/** the range a dot is allowed into, in ms: the app's speed slider is 1–200 wpm
 * and a dot is `1200 / wpm`, so this is every speed it can express */
const MIN_DOT = 6;
const MAX_DOT = 1200;

/** how far apart the candidate dots are. A finer grid buys nothing: a boundary
 * only has to land inside the gap between two clusters, and a gap that narrow
 * is not two clusters. */
const UNIT_STEP = 1.25;

/** the longest a dash is taken to be, in dots — only used to bound the search
 * from below, and to guess a speed out of a reading with no dot in it */
const LONGEST_DASH = 7;

/**
 * The dots a reading may be built on: everything from the shortest press being a
 * very long dash to the longest press being a dot, plus the speed the caller
 * already believed in.
 *
 * Largest first, so that when two scales read the message identically — which
 * they do constantly, since a boundary can slide anywhere inside a gap — the one
 * kept is the one that calls fewer presses dashes. That is the tie-break §3 asks
 * for: with nothing to separate `e` from `t`, read a lone press as the dot.
 */
function units(presses: number[], prior: number | null): number[] {
  const out: number[] = [];
  if (presses.length > 0) {
    let shortest = Infinity;
    let longest = 0;
    for (const ms of presses) {
      shortest = Math.min(shortest, ms);
      longest = Math.max(longest, ms);
    }
    const floor = Math.max(shortest / LONGEST_DASH, MIN_DOT);
    for (let unit = Math.max(longest * 1.2, floor); unit >= floor; unit /= UNIT_STEP) {
      out.push(unit);
    }
  }
  if (prior !== null) out.push(prior);
  return out;
}

/* ------------------------------------------------------------------ *
 * What a reading costs
 * ------------------------------------------------------------------ */

/**
 * What a duration out of place costs, against the charges below it.
 *
 * Everything here is priced in two currencies — how far a duration sits from
 * the centre of the class it was put in, and what the characters that come out
 * are — and this is the exchange rate between them. At 1 a reading is glad to
 * run six elements into one rare character rather than pay for the letter gaps
 * that would break them up; much over 2 it starts hearing a letter gap inside
 * the three dashes of an `o`. Measured over the corpus, which is the only
 * ground truth there is.
 */
const SPREAD_COST = 1.5;

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

/** what a one-element character costs, and what each one past the second in a
 * row costs on top: `e` and `t` are common, `eee` is a hand being cut up */
const LONE_COST = 0.4;
const LONE_RUN_COST = 2.5;
const LONE_RUN_AT = 2;

/**
 * What a word break costs: what stops a reading cutting a word out of every
 * letter, since a boundary that splits any cluster in two makes both halves
 * tighter than the whole.
 *
 * Where the words divide is scored on its own (R7) and it is the one charge
 * here that no letter depends on: over the corpus, everything from 0.2 to 0.5
 * reads the same letters, and only the spaces between them move. At 0.5 the
 * breaks in `ciao mondo` and `my name is al` do not pay for themselves; at 0.2
 * `the quik` comes apart into four words.
 */
const WORD_COST = 0.3;

/** what the speed the caller believed in is worth, in durations of evidence. It
 * does not grow with the message: a prior is one thing somebody said once, and
 * a hand that keys long enough to contradict it should be believed. */
const PRIOR_COST = 3;

/**
 * What a duration whose character has been committed counts for, against one
 * being keyed now.
 *
 * Almost nothing, and that is the point. An operator who starts fast and slows
 * down keys an `h` whose presses are longer than the dashes of a moment ago, and
 * a reading that weighs the two halves equally can only explain the new presses
 * as dashes of the old speed — which is what it did, and what the operator sees
 * as their `h` coming out as `tttt` or `eeee`. Weighted this low, the committed
 * durations stop arguing with the hand and do the one job they are still good
 * for: breaking a tie between two readings of what is being keyed now. At zero
 * they stop doing even that, and the fit loses the thread of a long message
 * (77/110 of the generated hands against 103).
 */
const COMMITTED_WEIGHT = 0.02;

/** one class of duration, as the fit measures it */
interface Cluster {
  /** how spread out it is about its own centre, in log space — morse is
   * multiplicative, and a cost in ms would call a slow hand four times looser
   * than an equally tight fast one */
  spread: number;
  centre: number;
}

/**
 * @param committed - how many of the values at the front of the array belong to
 * characters already shown. They are the same durations as any other and they
 * are not the hand any more, so they weigh `COMMITTED_WEIGHT` of one that is.
 * They come first because the frontier is a prefix of the run.
 */
function cluster(values: number[], committed = 0): Cluster {
  if (values.length === 0) return { spread: 0, centre: 0 };

  let sum = 0;
  let total = 0;
  for (let i = 0; i < values.length; i++) {
    const weight = i < committed ? COMMITTED_WEIGHT : 1;
    sum += weight * Math.log(Math.max(values[i], 1));
    total += weight;
  }
  const mean = sum / total;

  let spread = 0;
  for (let i = 0; i < values.length; i++) {
    const off = Math.log(Math.max(values[i], 1)) - mean;
    spread += (i < committed ? COMMITTED_WEIGHT : 1) * off * off;
  }
  return { spread, centre: Math.exp(mean) };
}

interface ReadOptions extends ScaleOptions {
  /**
   * How many leading events are already committed. Their durations are still
   * measured — they are the evidence for this hand's clusters — but the
   * characters they make have been shown, so they are not read again.
   */
  frozen?: number;
  /**
   * How long the key has been up at the end of the events. The last character
   * is left pending unless this outlasts the reading's own letter gap; a
   * finished message passes `Infinity`, because no press is coming.
   */
  idle?: number;
}

/**
 * One run of events read at one scale: a single pass that cuts the elements into
 * characters and collects each class of duration as it goes.
 */
function readAt(events: KeyEvent[], scale: Scale, options: ReadOptions): Reading {
  const { isCharacter, frozen = 0, idle = Infinity } = options;

  const dots: number[] = [];
  const dashes: number[] = [];
  const elementGaps: number[] = [];
  const letterGaps: number[] = [];
  const wordGaps: number[] = [];
  const letters: Character[] = [];
  /** how many of each class came from behind the frontier — see `cluster` */
  const done = { dots: 0, dashes: 0, elementGaps: 0, letterGaps: 0, wordGaps: 0 };

  let cost = 0;
  let code = '';
  let wordBreak = false;
  let loneRun = 0;
  let seen = 0;

  /** ends the character being read, and charges for what it turned out to be */
  const close = (endsWord: boolean) => {
    if (code) {
      if (!isCharacter(code)) cost += UNKNOWN_COST * code.length;
      if (code.length === 1) cost += loneRun >= LONE_RUN_AT ? LONE_COST + LONE_RUN_COST : LONE_COST;
      loneRun = code.length === 1 ? loneRun + 1 : 0;
      letters.push({ code, wordBreak, end: seen });
      code = '';
    }
    wordBreak = endsWord;
  };

  for (const event of events) {
    seen++;
    // an event in front of the frontier is measured, but the character it is
    // part of has been shown already and is not read again
    const shown = seen <= frozen;

    if (event.sound) {
      const dash = event.ms >= scale.dash;
      (dash ? dashes : dots).push(event.ms);
      if (shown) (dash ? done.dashes++ : done.dots++);
      else code += dash ? '-' : '.';
      continue;
    }
    if (event.ms < scale.letter) {
      elementGaps.push(event.ms);
      if (shown) done.elementGaps++;
      continue;
    }
    // a silence that ends a word is reported at both ends of it: it closes the
    // character before it, and it is the break in front of the character after
    const endsWord = event.ms >= scale.word;
    (endsWord ? wordGaps : letterGaps).push(event.ms);
    if (shown) (endsWord ? done.wordGaps++ : done.letterGaps++);
    close(endsWord);
  }

  // the silence at the end of the run has not finished — it ends when the next
  // press arrives, which may be never — so how long it has run is passed in
  let pending = code;
  if (code && idle >= scale.letter) {
    close(false);
    pending = '';
  }

  const dot = cluster(dots, done.dots);
  const dash = cluster(dashes, done.dashes);
  const element = cluster(elementGaps, done.elementGaps);
  const letter = cluster(letterGaps, done.letterGaps);
  const word = cluster(wordGaps, done.wordGaps);

  cost += SPREAD_COST * (dot.spread + dash.spread + element.spread + letter.spread + word.spread);
  cost += WORD_COST * wordGaps.length;

  // a boundary that cuts one cluster in half leaves both halves tighter than
  // the whole was, so tightness on its own is glad to invent a class nobody
  // keyed. A class nobody keyed is not a loose one, so each charge needs both
  // of its classes to be occupied.
  if (dots.length && dashes.length && dash.centre < dot.centre * MIN_DASH_RATIO) cost += SHAPE_COST;
  if (elementGaps.length && letterGaps.length && letter.centre < element.centre * MIN_GAP_RATIO) {
    cost += SHAPE_COST;
  }
  if (letterGaps.length && wordGaps.length && word.centre < letter.centre * MIN_GAP_RATIO) {
    cost += SHAPE_COST;
  }

  // a reading with no dots in it still implies a speed, out of its dashes
  const implied = dots.length ? dot.centre : dashes.length ? dash.centre / LONGEST_DASH : scale.unit;

  return { cost, letters, pending, dot: implied, contrast: dots.length > 0 && dashes.length > 0, scale };
}

interface FitOptions extends ReadOptions {
  /** the dot the caller already believes in, in ms, or null where there is no
   * such thing — a finished buffer arriving on its own has no speed attached */
  prior: number | null;
}

/** the cheapest reading of a run of events, over every scale worth trying */
function fit(events: KeyEvent[], options: FitOptions): Reading | null {
  const { prior } = options;

  const presses: number[] = [];
  for (const event of events) if (event.sound) presses.push(event.ms);

  let best: Reading | null = null;
  for (const unit of units(presses, prior)) {
    for (const shape of SHAPES) {
      const reading = readAt(
        events,
        {
          unit,
          dash: unit * shape.dash,
          letter: unit * shape.letter,
          word: unit * shape.word,
        },
        options
      );
      if (prior !== null) {
        // the speed the caller believed in is evidence about this hand, and on
        // a message that is all one class of press it is the only evidence
        // there is: `m` and `i` are the same durations at different speeds
        const drift = Math.log(Math.max(reading.dot, 1) / prior);
        reading.cost += PRIOR_COST * drift * drift;
      }
      if (best === null || reading.cost < best.cost) best = reading;
    }
  }
  return best;
}

/* ------------------------------------------------------------------ *
 * Interface A — a finished message
 * ------------------------------------------------------------------ */

/** the token a word break is written as, between the codes on either side of it */
const WORD_BREAK = '/';

/**
 * A finished message, read as dots, dashes and the breaks between them.
 *
 * No speed is passed in, deliberately: this is what the server has, and the
 * server has a buffer and nothing else. So it reads a message of nothing but
 * dashes as one of nothing but dots — that is not a bug but the ambiguity in §3
 * of the spec, and the live decoder below is the one with a speed to resolve it.
 *
 * @param buffer - alternating key-down and key-up durations in ms, starting with
 * a key-down: the array the chat sends over the websocket, complete.
 * @returns the codes, separated by ' ', with a `/` between words — e.g.
 * `".... . .-.. .-.. --- / .-- --- .-. .-.. -.."`. Codes rather than text
 * because which letters those are is the dialect's business
 * (`lib/morse/decode.ts`), not the decoder's.
 */
export function decodeTimings(buffer: number[], options: ScaleOptions): string {
  if (buffer.length === 0) return '';

  // the even entries are presses and the odd ones the silences after them,
  // which is the convention the whole app records in
  const events = buffer.map((ms, i) => ({ ms, sound: i % 2 === 0 }));
  const best = fit(events, { isCharacter: options.isCharacter, prior: null });
  if (best === null) return '';

  const out: string[] = [];
  for (const { code, wordBreak } of best.letters) {
    // a break with no word in front of it breaks nothing
    if (wordBreak && out.length > 0) out.push(WORD_BREAK);
    out.push(code);
  }
  return out.join(' ');
}

/* ------------------------------------------------------------------ *
 * Interface B — the key, live
 * ------------------------------------------------------------------ */

/**
 * How many characters into a message the reading may still change.
 *
 * The whole of the no-flicker promise (R8), and the only rewriting this decoder
 * does. While a message is this short nobody has started reading it and the
 * speed is genuinely still in question, so the fit is allowed to change its
 * mind about all of it; from the first character past the budget, every
 * character that the reading has finished is committed and never touched again.
 */
const FLICKER_LETTERS = 4;

/** how many committed events are kept behind the frontier as evidence. Without
 * them a decoder that has just committed a letter has no idea what a letter gap
 * looks like for this hand — and with `COMMITTED_WEIGHT` as low as it is, more
 * of them costs nothing but the reading. */
const KEEP_EVENTS = 48;

/** the most events read at once. A hand that never pauses long enough to end a
 * character would otherwise grow the run without end. */
const MAX_EVENTS = 64;

/** how far the believed dot moves towards each reading that measured one */
const ALPHA = 0.4;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * The same fit, run on the key as it is being pressed.
 *
 * Fed `addSound`/`addSilence` as the key is released and `idle` between presses.
 * What it draws is two channels: `visible`, the characters it has read, shown as
 * letters, and `preview`, the character still being keyed, shown as its dots and
 * dashes. A character moves from one to the other when a silence longer than
 * this hand's letter gap ends it — `letterSplit` is that silence, and
 * `wordSplit` the longer one that ends a word.
 *
 * The reading is made over the tail of the message: everything since the last
 * committed character, with `KEEP_EVENTS` older events kept in front of it as
 * evidence about the hand. Committed characters are never read again, which is
 * what makes R8 true by construction rather than by good behaviour.
 */
export class ScaleDecoder {
  /** the characters that have been committed. Nothing here ever changes. */
  letters: Letter[] = [];

  /** the events being read, and how many of them are behind the frontier */
  #events: KeyEvent[] = [];
  #frozen = 0;

  /** how long the key has been up since the last release */
  #idle = 0;

  /** the hand, as currently understood: one dot, in ms */
  #dot: number;

  #reading: Reading;

  /**
   * Whether the message has ever been longer than the flicker budget. Sticky: a
   * reading that merged two characters would otherwise put a long message back
   * inside the budget and re-open permission to rewrite it.
   */
  #settled = false;

  readonly #isCharacter: IsCharacter;

  constructor(dot: number, options: ScaleOptions) {
    this.#dot = clamp(dot, MIN_DOT, MAX_DOT);
    this.#isCharacter = options.isCharacter;
    this.#reading = this.#empty();
  }

  /** start a new message from a fresh dot estimate, in ms */
  reset(dot: number) {
    this.#dot = clamp(dot, MIN_DOT, MAX_DOT);
    this.letters = [];
    this.#events = [];
    this.#frozen = 0;
    this.#idle = 0;
    this.#settled = false;
    this.#reading = this.#empty();
  }

  /** the speed currently believed in, as one dot in ms. Always finite, > 0 */
  get dot(): number {
    return this.#dot;
  }

  /** the silence after which the character being keyed would end. Finite from
   * before the first press, because a caller waiting on it is waiting with a
   * timer and `setTimeout(fn, Infinity)` fires immediately. */
  get letterSplit(): number {
    return this.#reading.scale.letter;
  }

  /** the silence after which the word would end: how the keyer and the
   * playground know that nothing more is coming */
  get wordSplit(): number {
    return this.#reading.scale.word;
  }

  /** what to draw as letters: everything the reading has finished */
  get visible(): Letter[] {
    return [...this.letters, ...this.#reading.letters];
  }

  /** what to draw as dots and dashes: the character still being keyed */
  get preview(): string {
    return this.#reading.pending;
  }

  /** a press ended, having lasted `ms` */
  addSound(ms: number) {
    this.#events.push({ ms, sound: true });
    this.#idle = 0;
    this.#update(true);
  }

  /** a silence ended, having lasted `ms`: the next press has just arrived */
  addSilence(ms: number) {
    // a silence before the first press says nothing about the message
    if (this.#events.length === 0) return;
    this.#events.push({ ms, sound: false });
    this.#idle = 0;
    this.#update(true);
  }

  /**
   * The key has been up for `ms` in total and is still up.
   *
   * Cumulative, not incremental. The reading is told how long the unfinished
   * silence has run so that the last character of a message can be read before
   * the press that would measure it exists — which may be never.
   */
  idle(ms: number) {
    this.#idle = ms;
    this.#update(false);
  }

  /** nothing more is coming: commit everything, or the last characters of a
   * message sit in the preview waiting for a press that never arrives */
  flush() {
    this.#update(false);
    this.#commit(this.#reading.letters.length);
  }

  #empty(): Reading {
    const scale = {
      unit: this.#dot,
      dash: this.#dot * TEXTBOOK.dash,
      letter: this.#dot * TEXTBOOK.letter,
      word: this.#dot * TEXTBOOK.word,
    };
    return { cost: 0, letters: [], pending: '', dot: this.#dot, contrast: false, scale };
  }

  /**
   * @param fresh - whether an element has just been keyed. Only then is there
   * anything new to fit: an idle tick brings no duration, only a longer silence,
   * so it re-reads at the scale already chosen rather than choosing again. That
   * is what keeps the per-frame cost to one pass instead of three hundred, and
   * it is also why the estimate cannot walk while the key is up.
   */
  #update(fresh: boolean) {
    const options = {
      isCharacter: this.#isCharacter,
      frozen: this.#frozen,
      idle: this.#idle,
    };
    if (this.#events.length === 0) {
      this.#reading = this.#empty();
    } else if (fresh) {
      this.#reading = fit(this.#events, { ...options, prior: this.#dot }) ?? this.#empty();

      // A reading only moves the estimate if it fixed the scale itself, by
      // having seen both a dot and a dash. A stretch of one class of press
      // reads as whatever speed was already believed, so learning from it
      // would be learning from ourselves — R5, and the reason the estimate
      // used to run away on a message that opened with a dash.
      if (this.#reading.contrast) {
        this.#dot = clamp(this.#dot + ALPHA * (this.#reading.dot - this.#dot), MIN_DOT, MAX_DOT);
      }
    } else {
      this.#reading = readAt(this.#events, this.#reading.scale, options);
    }

    if (this.letters.length + this.#reading.letters.length > FLICKER_LETTERS) this.#settled = true;
    if (this.#settled) this.#commit(this.#reading.letters.length);

    if (this.#events.length > MAX_EVENTS) {
      // A hand that has keyed this far without one silence any scale would read
      // as a letter gap — an even drumming on the key is one — would grow the
      // run, and the cost of reading it, without end. So commit: the oldest
      // character if there is one, and otherwise the elements as they stand,
      // because a code nobody can read is still what the operator keyed and is
      // shown as itself.
      if (this.#reading.letters.length === 0 && this.#reading.pending) {
        const code = this.#reading.pending;
        this.#reading.pending = '';
        this.#reading.letters.push({ code, wordBreak: false, end: this.#events.length });
      }
      this.#commit(1);
    }
  }

  /** moves the first `count` characters of the reading into the committed text.
   * Their events stay behind the frontier as evidence — see `KEEP_EVENTS`. */
  #commit(count: number) {
    const taken = this.#reading.letters.splice(0, count);
    if (taken.length === 0) return;

    for (const { code, wordBreak } of taken) this.letters.push({ code, wordBreak });
    this.#frozen = taken[taken.length - 1].end;

    const drop = Math.max(0, this.#frozen - KEEP_EVENTS);
    if (drop > 0) {
      this.#events = this.#events.slice(drop);
      this.#frozen -= drop;
    }
  }
}
