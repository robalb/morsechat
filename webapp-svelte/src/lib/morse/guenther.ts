/**
 * Guenther's decoder: reading a hand by where its own clusters fall.
 *
 * Joel A. Guenther, *Machine Recognition of Hand-Sent Morse Code using the
 * PDP-12 Computer*, AFIT GE/EE/73A-9, December 1973 (786492.pdf). He recorded
 * three sessions of hand-sent morse, hand-labelled every pulse and space, and
 * plotted pulse duration against the duration of the space that followed it.
 * The whole algorithm falls out of what those plots look like, and three things
 * in them are worth having here:
 *
 *   1. **The dot/dash boundary is not the midpoint.** It is
 *      `dot/4 + dash/2` (eq. 3.2) — a little below the middle, because a hand's
 *      dots are far tighter around their mean than its dashes are, so the gap
 *      between the two clusters is not centred between the two averages. Our
 *      lib/morse/adaptive.ts splits at the midpoint, which sits too high and
 *      reads a hurried dash as a dot.
 *   2. **The same number splits the spaces.** The boundary between a gap inside
 *      a letter and a gap between letters is that same pulse average — one
 *      threshold, derived from the sounds, doing both jobs. Sounds are the
 *      better measurement (every element contributes one, only some contribute
 *      a gap), so a decoder that never estimates a silence population cannot
 *      have that estimate collapse. This is a different answer to the same
 *      problem `adaptive.ts` solves with `#refitSilence`.
 *   3. **A space is shorter when a dash came before it** (and a dash is longer
 *      when a letter ends after it): the hand is still moving. Both thresholds
 *      therefore *slope* with the length of the preceding dash, eqs. 3.4/3.5 —
 *      the negatively-sloping lines in his Figs. 3-2 to 3-4. Nothing else here
 *      or in the literature we have looked at does this, and it is the single
 *      most interesting idea in the paper.
 *
 * Character/word spacing is his too, and it is a nice trick: rather than try to
 * separate character gaps from word gaps — which his data says overlap too much
 * to separate — he averages *all* non-symbol spaces into one number (eq. 3.3)
 * and uses that average as the boundary between them. Character gaps outnumber
 * word gaps about four to one in English, so the average lands above the
 * character cluster and below the word one by itself.
 *
 * What is deliberately not his:
 *
 *   - **The initialisation.** He starts every average at zero and spends the
 *     first 49 pulses of the transmission getting them right, calling the first
 *     pulse a dash by definition. We have the wpm slider — a prior that is
 *     never absent and usually close — so the bases are seeded from it and his
 *     three-stage weight schedule (eqs. 4.1→4.4→4.6) is compressed to the first
 *     dozen elements, which is all a chat message has.
 *   - **Anything retroactive.** His program is a receiver printing a completed
 *     transmission on a teletype, so it can rewrite a character before printing
 *     it. Ours is a live preview that the operator reads while keying, and text
 *     that changes after it has been shown is the failure this whole part of
 *     the app exists to prevent. Every decision here is taken from what was
 *     known before the element arrived, committed, and never revisited. The one
 *     exception is `hold`, and it earns it by not showing the letter at all
 *     until it is sure — see below.
 *
 * The options are the variants the playground compares. `spaces`, `drag`,
 * `hold` and `runGuard` are ours, not the paper's, and each exists to fix
 * something the paper's program never had to face:
 *
 *   - `spaces` — the big one, and the one without which none of this reads a
 *     word: his two space boundaries both come off the pulse average, which
 *     works for an operator whose element gaps are one unit and fails
 *     completely on a hand that leaves 100ms between elements of a 60ms dot.
 *     See the option itself.
 *   - `drag` — his averages are only ever fed by the elements assigned to them,
 *     so a base that has seen nothing keeps whatever it started with. On a
 *     50-pulse transmission that is harmless. On "hello hello", where the
 *     operator keys eleven dots before their first dash, a dash base seeded from
 *     a wrong slider is still wrong when the first dash arrives — and one
 *     threshold too high turns the message into `eeee`. This pulls an unfed base
 *     towards 1:3 of the one that is being fed.
 *   - `runGuard` — `eee` and `ttt` are not English, so a run of them is the
 *     decoder telling on itself: the letter boundary has fallen below the gaps
 *     this operator leaves inside a letter, and — because nothing then ever
 *     falls below it — no measurement can pull it back up. The run is the
 *     measurement. It stops a collapse; nothing can undo one, because the `eee`
 *     has been shown.
 *   - `hold` — the letter that has just ended is not shown as a letter until the
 *     *next* gap has been measured. Its dots and dashes are on screen the whole
 *     time, so nothing is hidden and nothing is rewritten; what the delay buys
 *     is the chance to notice that the gap which "ended" it was much shorter
 *     than the gap that really ends a letter here, and to put a stray `e` back
 *     where it came from before anyone has read it as an `e`.
 */

import type { Letter } from './adaptive';

export type { Letter };

/** the running averages, in milliseconds */
export interface GuentherBases {
  /** the average dot */
  dot: number;
  /** the average dash */
  dash: number;
  /** the average of every space that was not inside a letter (eq. 3.3) */
  cw: number;
  /** the average gap between two elements of the same letter — `spaces` only */
  sym: number;
}

/**
 * The weight schedule.
 *
 * The paper runs the averages at 1/2 for the first 16 pulses, 1/4 for the next
 * 33 and 1/8 thereafter (eqs. 4.1, 4.4, 4.6): fast enough to find a hand it
 * knows nothing about, then slow enough not to chase one clumsy dash. We start
 * from the slider rather than from zero and a chat message is a few dozen
 * elements, so the same shape is compressed — and the fast stage can only ever
 * affect letters that have not been rendered yet, which is what makes it free.
 */
const PRIME_FAST = 4;
const PRIME_MID = 12;

/** how far from its average a duration may be and still be allowed to move it.
 * The paper has no such rule; the app's key clips a press at 1500ms, and one of
 * those landing in an average is worth more than a strict reading of eq. 4.6. */
const OUTLIER = 3;

/** the range a dot average is allowed into, in ms: 60wpm to 2wpm */
const MIN_DOT = 20;
const MAX_DOT = 600;

/**
 * The ratios the two pulse averages are held within, as multiples of the dot.
 *
 * The ceiling is far above the textbook 1:3 because the corpus says so: the
 * hands in lib/playground/recordings.ts key 60ms dots and 480ms dashes, a ratio
 * of eight. A straight key is a movement, and a beginner making sure the dash
 * reads as a dash makes it enormous. Clamping those to 1:6 — which an earlier
 * version did — drags the pulse boundary down under their own dashes.
 */
const MIN_RATIO = 2;
const MAX_RATIO = 10;

/** and the same for the non-symbol space average, which sits at about four
 * units: a character gap is three, a word gap seven, and the first is roughly
 * four times as common */
const MIN_CW_RATIO = 2.5;
const MAX_CW_RATIO = 12;

/** the range the symbol space average is held within, in dots — `spaces` only */
const MIN_SYM_RATIO = 0.4;
const MAX_SYM_RATIO = 4;

/**
 * How far above the letter boundary a word gap has to be, at the least.
 *
 * The C-W average is the boundary between letter gaps and word gaps only
 * because both populations are in it (eq. 3.3). A message with no word gap at
 * all still has an average, and without a floor it would sit in the middle of
 * the letter gaps and break the one word into pieces. A letter gap is three
 * units and the boundary below it about two, so a word gap — seven — is
 * comfortably past one and a half times that boundary.
 */
const MIN_WORD_RATIO = 1.5;

/**
 * How many one-element letters in a row mean the letter boundary is wrong.
 *
 * `eee` and `ttt` are not English. `e` is the commonest letter in the language
 * and `tt` happens ("attention"), but three lone elements in a row is not text
 * that was keyed — it is one letter that has been cut into pieces by a boundary
 * sitting below the gaps this operator leaves *inside* a letter. That is a
 * measurement the decoder can make about itself, and it is the only evidence
 * available when the boundary is so low that no gap ever falls under it: with
 * nothing below it, the estimate of what an element gap looks like never gets a
 * single sample, and the collapse is self-sustaining.
 */
const LONE_RUN = 3;

/** how many pulses a base may go unfed before `drag` starts pulling it back */
const STALE_AFTER = 3;

/** how far towards 1:3 an unfed base is pulled, per pulse, once it is stale */
const DRAG = 0.4;

/**
 * How much longer the gap that really ends a letter has to be than the gap
 * being reconsidered, for `hold` to take the earlier one back.
 *
 * A letter gap is three units and an element gap is one, so two gaps that are
 * both letter gaps land within a factor of about two of each other even from a
 * loose hand, and one that is less than two thirds of its neighbour was
 * probably not one. Tighter than this and the rule never fires; looser and it
 * starts merging letters that a slowing hand really did separate.
 */
const MERGE_RATIO = 0.65;

/** the codes the paper's word-space correction distrusts at the end of a word:
 * I, J, Q, U, V and Z in international morse (p. 54) */
const RARE_WORD_ENDINGS = new Set(['..', '.---', '--.-', '..-', '...-', '--..']);

export interface GuentherOptions {
  /**
   * Measure the silences from the silences, instead of taking both space
   * boundaries off the pulse average. Not the paper's, and the single change
   * that makes his algorithm work on this corpus.
   *
   * His whole space design rests on one number doing two jobs: the pulse
   * average splits dot from dash *and* splits a gap inside a letter from a gap
   * between letters. That holds for his operators, whose plots (Fig. 3-2) show
   * symbol spaces packed under 0.1s while the pulse average sits at 0.12s. It
   * does not hold for ours. The hands in lib/playground/recordings.ts key a
   * 60ms dot, a 480ms dash — and leave 100ms between two elements of the same
   * letter. Their pulse average lands at 260ms, which is above every letter gap
   * they leave, so the paper's rule runs whole words together; drag the dash
   * down to make the pulse boundary sane and it lands inside their element gaps
   * instead, and the words come apart into `e`s. There is no setting of one
   * threshold that reads both.
   *
   * So this keeps his *method* — a running average per labelled cluster, with
   * the boundary between the clusters — and applies it to the silences too. One
   * new average, `sym`, for the gaps inside a letter; his own C-W average
   * (eq. 3.3) for every gap that is not; and the letter boundary at the
   * midpoint of the two, exactly where he puts the dot/dash boundary. His
   * character/word rule is untouched, and so is his reason for it: those two
   * populations overlap and must not be estimated separately, while symbol
   * versus non-symbol is the one his plots show a "wide gap" between.
   */
  spaces?: boolean;

  /**
   * Pull a base that has not been fed towards 1:3 of the one that has. Not the
   * paper's; see the header. Without it a message of nothing but dots leaves
   * the dash average wherever the slider put it.
   */
  drag?: boolean;

  /**
   * Show a finished letter as its dots and dashes until the gap after it has
   * been measured, and use that gap to check the gap before it. Not the
   * paper's. Costs one letter of latency and buys back the lone `e` that a
   * momentary hesitation inside a letter would otherwise produce.
   */
  hold?: boolean;

  /** The paper's word-space correction (eq. 4.15): a word gap after I, J, Q,
   * U, V or Z is re-tested against a higher boundary, because English words
   * rarely end in those. International morse only — the codes are hard-coded. */
  wordCorrection?: boolean;

  /**
   * Watch for `eee` and `ttt` in what has been committed, and take them as
   * proof that the letter boundary is below the operator's own element gaps —
   * see `LONE_RUN`. Not the paper's. It fixes the boundary going forwards; it
   * cannot and does not touch the letters that have already been shown.
   */
  runGuard?: boolean;

  /**
   * The paper's error correction (Fig. 4-12), which only ever runs on a code
   * that is not a character at all: drop an element shorter than half a dot (a
   * key bounce), then try splitting the code at its longest internal gap (two
   * letters run together by a short gap). Needs `isCharacter`.
   */
  errorCorrection?: boolean;

  /** whether a code is a character in the reader's table. Without it the code
   * corrections have no way to tell a repair from a different mistake, and are
   * skipped. */
  isCharacter?: (code: string) => boolean;
}

/** The bases a message starts from, given the speed under the slider. */
export function basesFromWpm(wpm: number): GuentherBases {
  const dot = 1200 / Math.min(Math.max(wpm, 1), 200);
  // the C-W average sits at about four units: a letter gap is three, a word gap
  // seven, and the first is roughly four times as common
  return { dot, dash: dot * 3, cw: dot * 4, sym: dot };
}

/** what the bases say the operator is doing, for the readout and the tests */
export function wpmOf(bases: GuentherBases): number {
  return Math.round(1200 / bases.dot);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export class GuentherDecoder {
  bases: GuentherBases;

  /** the characters decided so far. Nothing ever leaves or changes here. */
  letters: Letter[] = [];

  /** the dots and dashes of the character being keyed */
  pending = '';

  readonly #options: GuentherOptions;

  /** the durations behind `pending`: its elements, and the gaps between them.
   * Only the error correction reads these. */
  #pendingSounds: number[] = [];
  #pendingGaps: number[] = [];

  /**
   * The letter that has just ended, under `hold`: decided, drawn as its dots
   * and dashes, and not yet committed. It is committed when the next gap has
   * been measured — or merged back into the letter after it, if that gap says
   * the one that ended it was too short to have been a letter gap.
   */
  #held: {
    code: string;
    wordBreak: boolean;
    sounds: number[];
    gaps: number[];
    /** the gap that ended it, once measured */
    gap: number;
  } | null = null;

  /** how many pulses have been seen, for the weight schedule */
  #pulses = 0;

  /** the last pulse, which both thresholds slope with (eqs. 3.4, 3.5) */
  #lastPulse = 0;
  #lastWasDash = false;

  /** committed one-element letters in a row, and the gaps that closed them:
   * the evidence `runGuard` acts on */
  #loneRun = 0;
  #loneGaps: number[] = [];

  /** the gap that closed the character being keyed, once it is known */
  #closingGap = 0;

  /** which pulse each average last saw, for `drag` */
  #lastFed = { dot: 0, dash: 0 };

  /** whether `pending` was already closed by the letter timer and we are
   * waiting for the silence that did it to end. As in adaptive.ts. */
  #closed = false;

  /** whether the next letter to be committed starts a word */
  #wordBreak = false;

  constructor(seed: GuentherBases, options: GuentherOptions = {}) {
    this.bases = { ...seed };
    this.#options = options;
  }

  reset(seed: GuentherBases) {
    this.bases = { ...seed };
    this.letters = [];
    this.pending = '';
    this.#pendingSounds = [];
    this.#pendingGaps = [];
    this.#held = null;
    this.#pulses = 0;
    this.#lastPulse = 0;
    this.#lastWasDash = false;
    this.#lastFed = { dot: 0, dash: 0 };
    this.#loneRun = 0;
    this.#loneGaps = [];
    this.#closingGap = 0;
    this.#closed = false;
    this.#wordBreak = false;
  }

  /* ---------------------------------------------------------------- *
   * The boundaries
   * ---------------------------------------------------------------- */

  /**
   * The dot/dash boundary, and the element/letter gap boundary: eq. 3.2.
   *
   * `dot/4 + dash/2` rather than `(dot + dash)/2`. For a textbook 1:3 hand that
   * is 1.75 dots instead of 2, and the difference is the whole point — his
   * plots show the empty lane between the two clusters sitting nearer the dots,
   * because dashes scatter and dots do not.
   */
  get pulseAvg(): number {
    return this.bases.dot / 4 + this.bases.dash / 2;
  }

  /**
   * The silence after which the character being keyed is finished: eq. 3.4.
   *
   * The pulse average, lowered when the last thing keyed was a dash — a hand
   * that has just held the key down comes back up late, so the gap it leaves is
   * shorter than the one it leaves after a dot. The dash is capped at twice its
   * average so that one enormous press cannot drive the boundary to nothing.
   */
  get letterSplit(): number {
    if (this.#options.spaces) {
      // the same boundary-between-two-averages he uses for the pulses, on the
      // two silence populations: the gaps inside a letter, and his one average
      // of every gap that is not
      return this.#slope((this.bases.sym + this.bases.cw) / 2);
    }
    return this.#slope(this.pulseAvg);
  }

  /** the silence after which the character ended a word: eqs. 3.3 and 3.5 */
  get wordSplit(): number {
    if (this.#options.spaces) {
      // his boundary, with the floor that a message of one word needs
      return Math.max(this.#slope(this.bases.cw), this.letterSplit * MIN_WORD_RATIO);
    }
    return this.#slope(this.bases.cw);
  }

  /**
   * The paper's negatively-sloping boundary, eqs. 3.4 and 3.5 — and, under
   * `spaces`, a tempered version of it.
   *
   * His line is measured *from the boundary*: a dash that is long compared to
   * the threshold pulls the threshold down by a quarter of the difference. On
   * his operators, whose dashes sit at three units, that is a small nudge. On a
   * hand that keys a 60ms dot and a 450ms dash — the corpus in
   * lib/playground/recordings.ts, ratio seven — the difference is enormous, and
   * a quarter of it drops the letter boundary to below the gaps that hand
   * leaves *inside* a letter. That is where the `o` in "hello" comes apart into
   * `ttt`: three dashes, and after each one a boundary so low that the gap to
   * the next element reads as the end of a letter.
   *
   * The tempered version measures the same correlation from the *dash average*
   * instead: an ordinary dash moves nothing, an unusually long one still
   * shortens the gap it is allowed, and the whole correction is capped at a
   * quarter of the boundary. Our corpus supports that reading better than his —
   * measured over the recordings, the gaps inside a letter after a dash (95 to
   * 198ms) are not shorter than the ones after a dot (87 to 199ms) at all.
   */
  #slope(boundary: number): number {
    if (!this.#lastWasDash) return boundary;
    const dash = Math.min(this.#lastPulse, this.bases.dash * 2);

    if (this.#options.spaces) {
      const excess = clamp((dash - this.bases.dash) / 4, -boundary / 4, boundary / 4);
      return Math.max(boundary - excess, this.bases.dot);
    }

    // his line, with a floor: a boundary below one dot would make every gap a
    // letter gap
    return Math.max(boundary - (dash - boundary) / 4, this.bases.dot);
  }

  /* ---------------------------------------------------------------- *
   * Input
   * ---------------------------------------------------------------- */

  /** A press ended, having lasted `ms`. */
  addSound(ms: number) {
    const isDash = ms > this.pulseAvg;
    this.pending += isDash ? '-' : '.';
    this.#pendingSounds.push(ms);
    this.#pulses++;
    this.#lastPulse = ms;
    this.#lastWasDash = isDash;
    this.#feed(isDash ? 'dash' : 'dot', ms);
  }

  /** A silence ended, which is to say the next press arrived. */
  addSilence(ms: number) {
    if (ms < this.letterSplit && !this.#closed) {
      // inside a letter: record where it was, for the error correction's
      // run-on split, and measure it if we are measuring silences
      this.#pendingGaps.push(ms);
      if (this.#options.spaces) this.#feedGap('sym', ms);
      return;
    }

    const word = ms >= this.wordSplit && !this.#correctedWordSpace(ms);

    if (this.#options.spaces) {
      // Every gap that ended a letter goes in, whether or not it also ended a
      // word — that is what eq. 3.3 is, and it is why this average cannot get
      // stuck. An estimate fed only by the gaps it has already called letter
      // gaps is a ratchet: seed it too low, and the operator's real letter gaps
      // come in above the word boundary, get counted as word gaps, and never
      // pull it back up. That is exactly what an earlier version of this file
      // did, and every letter of "hello hello" came out with a word break after
      // it.
      this.#feedGap('cw', ms);
    } else if (!this.#lastWasDash) {
      // A gap between letters is one of the two populations the C-W average is
      // made of, and it is measured whether or not we can tell which (eq. 3.3).
      // The paper only feeds it spaces that follow a dot, because a space after
      // a dash is shortened by the hand still moving and would drag the average
      // down; that is the same asymmetry `#slope` exists for.
      this.#feedCw(ms);
    }
    // the letter timer may have closed the character already, in which case the
    // held one is still carrying a gap of unknown length: this is that length
    if (this.#held && this.#held.gap === 0 && !this.pending) this.#held.gap = ms;
    if (this.#closed && !this.pending) this.#lateGap(ms);
    this.#close(ms, word);
    this.#closed = false;
  }

  /**
   * The operator has been quiet for `letterSplit`: the character is finished.
   *
   * Called by the playground's idle tick and by the keyer's letter timer. The
   * silence has no measured length yet — it ends when the next press arrives —
   * so the letter is closed with what is known, and `addSilence` will do the
   * measuring later.
   */
  closeLetter() {
    if (!this.pending) return;
    this.#close(0, false);
    this.#closed = true;
  }

  /**
   * Nothing more is coming: commit everything, including a held letter.
   *
   * The playground calls this once the key has been up long past any letter
   * gap. Without it the last letter of a message would sit on screen as dots
   * and dashes forever under `hold`, waiting for a gap that will never be
   * measured.
   */
  flush() {
    if (this.pending) this.#close(0, false);
    this.#release();
  }

  /* ---------------------------------------------------------------- *
   * Committing
   * ---------------------------------------------------------------- */

  /**
   * The character being keyed has ended.
   *
   * @param gap - the silence that ended it, or 0 if it has not finished yet
   * @param word - whether that silence was long enough to end a word
   */
  #close(gap: number, word: boolean) {
    if (!this.pending) {
      if (word) this.#wordBreak = true;
      return;
    }

    if (this.#options.hold) {
      // the letter before this one has now been followed by a whole letter, so
      // whatever it was going to be, it is that
      this.#release(gap);
      this.#held = {
        code: this.pending,
        wordBreak: this.#wordBreak,
        sounds: this.#pendingSounds,
        gaps: this.#pendingGaps,
        gap,
      };
      this.#wordBreak = word;
      this.pending = '';
      this.#pendingSounds = [];
      this.#pendingGaps = [];
      return;
    }

    this.#emit(this.pending, this.#wordBreak, this.#pendingSounds, this.#pendingGaps, gap);
    this.#wordBreak = word;
    this.pending = '';
    this.#pendingSounds = [];
    this.#pendingGaps = [];
  }

  /**
   * Commit the held letter, or take it back.
   *
   * `gap` is the silence that has just ended the letter *after* the held one.
   * Two gaps that both end letters are within a factor of about two of each
   * other; if the one that ended the held letter was much the shorter of the
   * two, it was an element gap that we read as a letter gap, and the "letter"
   * it produced belongs to the one after it. Undoing that is only allowed
   * because the held letter was never shown as a letter — its dots and dashes
   * are on screen either way, and they do not change.
   */
  #release(gap = 0) {
    const held = this.#held;
    if (!held) return;
    this.#held = null;

    const mergeable =
      gap > 0 &&
      held.gap > 0 &&
      held.gap < gap * MERGE_RATIO &&
      // only a lone element is taken back. A whole letter that came out of a
      // short gap is far more likely to be a letter the operator hurried than a
      // fragment, and merging it would destroy a correct reading.
      held.code.length === 1 &&
      this.#isCharacter(held.code + this.pending);

    if (mergeable) {
      this.pending = held.code + this.pending;
      this.#pendingSounds = [...held.sounds, ...this.#pendingSounds];
      this.#pendingGaps = [...held.gaps, held.gap, ...this.#pendingGaps];
      // the word break the held letter was carrying belongs to the merged one
      this.#wordBreak = held.wordBreak;
      return;
    }

    this.#emit(held.code, held.wordBreak, held.sounds, held.gaps, held.gap);
  }

  /**
   * One character, decided and on its way to the screen.
   *
   * The paper's error correction (Fig. 4-12) runs here and only here: it is
   * entered *only* when the code is not a character at all, which is what keeps
   * it from being the retroactive re-reading this decoder must not do. A code
   * that reads as something is never second-guessed.
   */
  #emit(code: string, wordBreak: boolean, sounds: number[], gaps: number[], gap: number) {
    const parts = this.#correct(code, sounds, gaps);
    for (const part of parts) {
      this.letters.push({ code: part, wordBreak });
      // only the first part of a split character starts the word
      wordBreak = false;
    }
    // the gap belongs to the last part: it is the one it ended
    this.#watchLoneRun(parts[parts.length - 1], gap);
  }

  /**
   * Notice `eee` and `ttt` going out, and move the letter boundary above the
   * gaps that produced them.
   *
   * The gaps that closed those letters were, on this evidence, gaps *inside* a
   * letter, so they are what an element gap looks like for this operator — and
   * they are samples the symbol average could not otherwise have, because a
   * boundary this low never lets anything fall below it. Raising the average to
   * meet them raises the boundary above them, and the run stops.
   *
   * Only the letters after this are affected. The `eee` that triggered it is
   * already on screen and stays there: this cannot repair a collapse, it can
   * only end one, which is the most a decoder that never rewrites can do.
   */
  #watchLoneRun(code: string, gap: number) {
    if (!this.#options.runGuard) return;

    if (code.length !== 1) {
      this.#loneRun = 0;
      this.#loneGaps = [];
      return;
    }

    this.#loneRun++;
    if (gap > 0) this.#loneGaps.push(gap);
    if (this.#loneRun < LONE_RUN) return;

    this.#raiseSym();
  }

  /**
   * The gap that closed a lone letter, arriving late.
   *
   * A letter is usually closed by the idle timer, which fires while the key is
   * still up and so has no length to report; the length only exists when the
   * next press ends the silence. This is that length, handed back to the run
   * guard afterwards.
   */
  #lateGap(ms: number) {
    if (!this.#options.runGuard || this.#loneRun === 0) return;
    this.#loneGaps.push(ms);
    if (this.#loneRun >= LONE_RUN) this.#raiseSym();
  }

  #raiseSym() {
    if (this.#loneGaps.length === 0) return;
    const mean = this.#loneGaps.reduce((a, b) => a + b, 0) / this.#loneGaps.length;
    this.bases.sym = Math.max(this.bases.sym, mean);
    this.#loneRun = 0;
    this.#loneGaps = [];
    this.#sane();
  }

  #correct(code: string, sounds: number[], gaps: number[]): string[] {
    const { errorCorrection } = this.#options;
    if (!errorCorrection || !this.#options.isCharacter) return [code];
    if (this.#isCharacter(code)) return [code];

    // Part 2: a pulse shorter than half a dot is a bounce, not an element
    // (eq. 4.16). Dropping it is the one repair that can rescue a code without
    // inventing anything.
    const minDot = this.bases.dot / 2;
    if (sounds.some((ms) => ms < minDot)) {
      const kept = [...code].filter((_, i) => sounds[i] === undefined || sounds[i] >= minDot);
      const repaired = kept.join('');
      if (repaired && this.#isCharacter(repaired)) return [repaired];
    }

    // Part 3: two characters run together by a gap that was not read as one.
    // The paper splits at the longest gap inside the invalid code, on the
    // assumption that the intended letter gap is the longest thing in there.
    if (gaps.length && code.length > 1) {
      let at = 0;
      for (let i = 1; i < gaps.length; i++) if (gaps[i] > gaps[at]) at = i;
      const left = code.slice(0, at + 1);
      const right = code.slice(at + 1);
      if (left && right && this.#isCharacter(left) && this.#isCharacter(right)) {
        return [left, right];
      }
    }

    return [code];
  }

  #isCharacter(code: string): boolean {
    return this.#options.isCharacter?.(code) ?? false;
  }

  /**
   * The paper's word-space correction, eq. 4.15.
   *
   * English words hardly ever end in I, J, Q, U, V or Z, so when one of those
   * is followed by something that looked like a word gap, the gap is re-tested
   * against a higher boundary — the midpoint of the non-symbol space average
   * and the pulse average — and demoted to a letter gap unless it clears that
   * too. It is a linguistic rule and it is decided before the space is drawn,
   * so it changes nothing that has been shown.
   */
  #correctedWordSpace(ms: number): boolean {
    if (!this.#options.wordCorrection) return false;
    // the character this space follows: the one being keyed, or — if the letter
    // timer has already closed it — the held or last committed one
    const code =
      this.pending || this.#held?.code || this.letters[this.letters.length - 1]?.code;
    if (!code || !RARE_WORD_ENDINGS.has(code)) return false;
    return ms < (this.bases.cw + this.pulseAvg) / 2;
  }

  /* ---------------------------------------------------------------- *
   * The averages
   * ---------------------------------------------------------------- */

  /** the paper's three-stage weight schedule, compressed (eqs. 4.1/4.4/4.6) */
  #weight(): number {
    if (this.#pulses <= PRIME_FAST) return 1 / 2;
    if (this.#pulses <= PRIME_MID) return 1 / 4;
    return 1 / 8;
  }

  #feed(kind: 'dot' | 'dash', ms: number) {
    const base = this.bases[kind];
    if (ms <= base * OUTLIER && ms >= base / OUTLIER) {
      this.bases[kind] = base + this.#weight() * (ms - base);
      this.#lastFed[kind] = this.#pulses;
    }
    if (this.#options.drag) this.#drag(kind);
    this.#sane();
  }

  #feedCw(ms: number) {
    const base = this.bases.cw;
    if (ms > base * OUTLIER || ms < base / OUTLIER) return;
    this.bases.cw = base + this.#weight() * (ms - base);
    this.#sane();
  }

  /**
   * One silence, into the average of its kind — `spaces` only.
   *
   * A gap that followed a dash is shortened by the hand still coming back up,
   * which is the correlation `#slope` lowers the boundary for. The same
   * correction is added back here rather than the measurement being thrown
   * away: with it, a gap after a dash and a gap after a dot are two samples of
   * the same thing, and both are worth having.
   */
  #feedGap(kind: 'sym' | 'cw', ms: number) {
    const base = this.bases[kind];
    const value = ms + (base - this.#slope(base));
    if (value > base * OUTLIER || value < base / OUTLIER) return;
    this.bases[kind] = base + this.#weight() * (value - base);
    this.#sane();
  }


  /**
   * Pull the average that was not just fed towards 1:3 of the one that was.
   *
   * Not the paper's. His averages are each fed only by their own elements,
   * which is right — it is what stops a misread element from teaching the
   * threshold that misread it — but it means an average that has seen nothing
   * still holds whatever it was seeded with. Ours is seeded from a slider the
   * operator may never have touched, and a message can easily run a dozen
   * elements before the first dash. The pull is deliberately weak and only
   * starts once the base has gone a few pulses unfed: it is a way out of a
   * wrong seed, not a standing bias towards the textbook.
   */
  #drag(fed: 'dot' | 'dash') {
    const other = fed === 'dot' ? 'dash' : 'dot';
    if (this.#pulses - this.#lastFed[other] <= STALE_AFTER) return;
    const target = fed === 'dot' ? this.bases.dot * 3 : this.bases.dash / 3;
    this.bases[other] += DRAG * (target - this.bases[other]);
  }

  /** the guards that keep one wild press from producing a nonsense hand */
  #sane() {
    this.bases.dot = clamp(this.bases.dot, MIN_DOT, MAX_DOT);
    this.bases.dash = clamp(
      this.bases.dash,
      this.bases.dot * MIN_RATIO,
      this.bases.dot * MAX_RATIO
    );
    this.bases.cw = clamp(
      this.bases.cw,
      // above the gaps inside a letter as well as above the dot: the failure it
      // has to be kept out of is the letter boundary sinking under them
      Math.max(this.bases.dot * MIN_CW_RATIO, this.bases.sym * 2),
      this.bases.dot * MAX_CW_RATIO
    );
    this.bases.sym = clamp(
      this.bases.sym,
      this.bases.dot * MIN_SYM_RATIO,
      this.bases.dot * MAX_SYM_RATIO
    );
  }

  /* ---------------------------------------------------------------- *
   * Output
   * ---------------------------------------------------------------- */

  /**
   * What is on screen but not yet a letter: the held character's elements, and
   * the ones of the character being keyed.
   */
  get preview(): string {
    const held = this.#held?.code ?? '';
    return held && this.pending ? `${held} ${this.pending}` : held + this.pending;
  }
}
