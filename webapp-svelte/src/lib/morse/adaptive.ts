/**
 * Reading a straight key that does not keep time.
 *
 * The fixed decoder (./decode.ts) is told the speed and measures the message
 * against it. That is right for a paddle, where the app makes the timing, and
 * wrong for a straight key held by someone still learning: they key at whatever
 * speed their hand manages, and it is not the number under the slider.
 *
 * The obvious fix — measure the whole message and decode it against the
 * measurement — is the one thing that cannot be done in a live preview. Every
 * new element changes the measurement, the measurement re-decodes the whole
 * buffer, and a message that read "hello" while it was being keyed turns into
 * "eeee ee" as soon as the operator slows down. Re-reading what the operator
 * has already seen is worse than reading it wrong: they trust what is on the
 * screen while they key the next letter.
 *
 * So this decoder is *causal*. Each element is classified against what was
 * known before it arrived, committed, and never looked at again. The estimate
 * moves — that is the whole point — but it only ever moves what has not been
 * decoded yet. Slowing down mid-message costs you the letter you are slowing
 * down on, not the sentence behind it.
 *
 * The adaptation is Yang et al. 2000, "A novel approach to adaptive Morse code
 * recognition for disabled persons" (yang2000.pdf), which does exactly this:
 * running bases for the elements, each updated only from the elements assigned
 * to it, with the dot/dash decision taken at the midpoint of the operator's own
 * dot and dash rather than at a fixed multiple of a nominal dit. Five things
 * are deliberately not theirs:
 *
 *   - their initialisation, which needs a first character containing both a dot
 *     and a dash and skips characters until it finds one. We have the wpm
 *     slider, which is a perfectly good prior and is never absent.
 *   - their tone_base = tonesum/toneratio, which places the split at about 1.33
 *     dits. The midpoint of dot and dash is the sane reading of the same idea
 *     and copes with a hand key whose dashes run 4:1.
 *   - their update weight of 1/2, which over-fits its own jitter on chat-length
 *     messages. 0.3 is calmer and still locks on within a couple of letters.
 *   - their 1.5x/0.5x outlier rule, which freezes adaptation exactly when it is
 *     needed — a novice really does change speed by more than half. Only wild
 *     values are dropped here, which is what the rule is actually good for: the
 *     1500ms artefact of a press that was never released.
 *   - their independent silent_base. Their operators' silences really are
 *     unrelated to their tones; ours are the same hand, and an element gap is
 *     the same one unit as a dot. Three bases are kept rather than four, and
 *     the split that separates a letter from an element is taken against the
 *     dot. See `letterSplit` for why that matters more than it sounds.
 *
 * The rules that are ours entirely all exist for one reason, which is the thing
 * a running average of classified elements gets wrong: **an estimate fed only
 * by what it has already decided cannot correct itself.** When the split is in
 * the wrong place, the values that would move it back are the very ones it is
 * throwing into the wrong pile, and the error feeds itself. It goes wrong in
 * both directions — a dash base that never sees a dash and holds the split
 * above every press, a letter gap base that sees only misread element gaps and
 * sinks until every letter comes apart into dots — and neither is recoverable
 * by tuning a weight. So `#drag` keeps an unobserved base from going stale,
 * word gaps count as evidence about letter gaps rather than being discarded,
 * and `#refit` and `#refitSilence` re-measure both splits from the raw
 * durations of a sliding window, which is the only estimate here that does not
 * ask the classification what it thinks.
 *
 * Nothing in here is reactive and nothing in here knows about the dialect: it
 * turns durations into dots and dashes, and lib/morse/decode.ts turns those
 * into letters. That split is what lets the dialect change mid-message without
 * re-classifying a thing.
 */

/** the running estimates, in milliseconds */
export interface SpeedBases {
  /** a dot: one unit of sound */
  dot: number;
  /** a dash: three units of sound */
  dash: number;
  /** the silence between two letters: three units */
  charGap: number;
}

/** one committed character */
export interface Letter {
  /** its dots and dashes, e.g. `-...` */
  code: string;
  /** whether the silence before it was long enough to end a word */
  wordBreak: boolean;
}

/**
 * How fast the bases follow the operator.
 *
 * A base moves this fraction of the way to each new value, so 0.3 is a memory
 * of about three elements of the same kind — long enough not to chase one
 * clumsy dash, short enough to have followed a novice who is winding down by
 * the time they finish the word.
 */
const ALPHA = 0.3;

/**
 * The weight used for the first few elements of a message, when the only thing
 * known is the slider and the slider may be nowhere near right.
 *
 * Those elements are decoded against the prior whatever we do — there is no
 * information yet — so the only question is how long the prior keeps hurting.
 * This buys the lock-on at no cost: it can only affect letters that have not
 * been rendered yet.
 */
const ALPHA_PRIMING = 0.6;
const PRIMING_ELEMENTS = 4;

/** how many elements have to be seen before the estimate is worth keeping */
const LEARNED_ELEMENTS = 6;

/**
 * How far from its base a value may be and still be used to update it.
 *
 * Yang's 1.5x is far too tight for a real hand — a beginner's dashes vary by
 * more than that between two letters — and using it freezes the bases at their
 * seed. Three times is the width that only catches things that are not really
 * elements at all: the key that was left down, the pause where the operator
 * stopped to think.
 */
const OUTLIER = 3;

/**
 * The ratio a three-unit thing may have to a one-unit thing.
 *
 * Only one base of a pair is updated by any given element, so a long run of
 * dits ("hi", "es") drags the dot down and leaves the dash where it was, and
 * the split between them ends up somewhere neither of them justifies. Pulling
 * the idle one along keeps them a plausible description of one hand. The band
 * is wide: 1:3 is the definition, but hand keys sit anywhere from 1:2.5 to 1:5
 * and it is not this code's job to correct them.
 */
const MIN_RATIO = 2;
const MAX_RATIO = 6;

/**
 * The letter gap gets a wider ceiling than the dash does, because it is where
 * an operator's own timing shows up most: a hand key's dash is a movement and
 * stays near 1:3, but the gap between two letters is where the thinking
 * happens, and six or seven dots of it is an ordinary beginner. The ceiling has
 * to be above that or the split sits below the gaps the operator actually
 * leaves between elements, and their letters come apart into dots.
 */
const MAX_CHAR_RATIO = 8;

/**
 * How many elements go by before a base that has not been fed stops counting as
 * evidence, and how hard it is then pulled back towards 1:3. See `#drag`, which
 * is what keeps a wrong seed from being permanent.
 */
const STALE_AFTER = 3;
const DRAG = 0.5;

/** how many of the operator's own dots a silence may be and still be believed
 * to be a letter gap rather than an unrecognised word gap */
const CREDIBLE_CHAR_GAP = 5;

/**
 * The sound window: how many recent presses are kept, how few of them will do,
 * and how far apart the shortest and the longest have to be before they are
 * read as two kinds of thing rather than one. See `#refit`.
 */
const WINDOW = 8;
const WINDOW_MIN = 6;

/**
 * The same for the silences, which need a longer memory: a window of presses
 * fills up inside two characters, but a window of silences has to span enough
 * characters to have some gaps *between* them in it, and most silences are the
 * ones inside a letter.
 */
const SILENCE_WINDOW = 14;
const SILENCE_WINDOW_MIN = 5;

/**
 * How much longer one group has to be than the one below it to be its own
 * group.
 *
 * The silences get the looser figure, because the populations they have to
 * separate sit closer together than the sounds' do. A dot and a dash are 1 and
 * 3; an element gap and a letter gap are 1 and 3 in the textbook but 2 and 6 in
 * a real loose hand, and with a wobble either side of both, the air between
 * them can narrow to about half again. Demanding 1.7 there finds no break at
 * all in exactly the hands that need one.
 */
const SEPARATION = 1.7;
const SILENCE_SEPARATION = 1.45;

/** the range a dot base is allowed to wander into, in ms (60wpm to 2wpm) */
const MIN_DOT = 20;
const MAX_DOT = 600;

/** The bases a message starts from, given the speed under the slider. */
export function basesFromWpm(wpm: number): SpeedBases {
  const dot = 1200 / Math.min(Math.max(wpm, 1), 200);
  return { dot, dash: dot * 3, charGap: dot * 3 };
}

/** what the bases say the operator is doing, for the readout and the tests */
export function wpmOf(bases: SpeedBases): number {
  return Math.round(1200 / bases.dot);
}

export class AdaptiveDecoder {
  /** the current estimates; read for the readout, and by the keyer's timers */
  bases: SpeedBases;

  /** the characters decided so far. Nothing ever leaves or changes here. */
  letters: Letter[] = [];

  /** the dots and dashes of the character being keyed */
  pending = '';

  /** how many elements have been used to adapt, priming and outliers aside */
  #adapted = 0;

  /** sounds seen, and which of them the dot and the dash bases last saw */
  #sounds = 0;
  #last = { dot: 0, dash: 0 };

  /** the last few presses, whatever they were read as, for `#refit` */
  #window: number[] = [];

  /** and the last few silences, for `#refitSilence` */
  #silences: number[] = [];

  /**
   * Whether `pending` was already committed by the letter timer and we are
   * waiting for the silence that did it to actually end.
   *
   * The preview shows a letter as soon as the operator has been quiet long
   * enough, which is before the silence has a measured length — it ends when
   * the next key press arrives, and that may be seconds away. So the timer
   * commits the letter and this says so, and when the silence finally does
   * arrive it is only used to adapt and to decide whether it was a word gap.
   * Without it the letter would be committed twice.
   */
  #closed = false;

  /** whether the next letter to be committed is the start of a word */
  #wordBreak = false;

  constructor(seed: SpeedBases) {
    this.bases = { ...seed };
  }

  /** Starts a new message from the given estimates. */
  reset(seed: SpeedBases) {
    this.bases = { ...seed };
    this.letters = [];
    this.pending = '';
    this.#adapted = 0;
    this.#sounds = 0;
    this.#last = { dot: 0, dash: 0 };
    this.#window = [];
    this.#silences = [];
    this.#closed = false;
    this.#wordBreak = false;
  }

  /** whether enough has been keyed for these estimates to seed a next message */
  get learned(): boolean {
    return this.#adapted >= LEARNED_ELEMENTS;
  }

  /**
   * The silence, in ms, after which the character being keyed is finished.
   *
   * The keyer runs its letter timer at exactly this, which is what keeps the
   * two paths agreeing: a gap that arrives before it fires is shorter than the
   * split and is an element gap, and one that fires the timer is longer and is
   * a letter gap. Whether the operator paused or kept going, the same duration
   * gets read the same way.
   */
  get letterSplit(): number {
    // the dot stands in for the element gap here, and deliberately: they are
    // the same unit of the same hand, and the sound stream measures that unit
    // far better than the silences do. Every element contributes a sound, only
    // some of them contribute an element gap, and a silence that is misread
    // corrupts the estimate that decided to misread it. Anchoring on the sounds
    // is what stops that loop — a wrong split can no longer feed itself.
    return (this.bases.dot + this.bases.charGap) / 2;
  }

  /** the silence, in ms, after which the character being keyed ended a word */
  get wordSplit(): number {
    // the midpoint of a letter gap (3 units) and a word gap (7), expressed
    // against the letter gap, because that is the one we measure
    return (this.bases.charGap * 5) / 3;
  }

  /* ---------------------------------------------------------------- *
   * Input
   * ---------------------------------------------------------------- */

  /**
   * A press ended.
   *
   * @param ms - how long the key was down
   * @param clipped - true if the press was cut off by the keyer's maximum
   * rather than by the operator, in which case it says nothing about their
   * speed and is used for nothing but its dot or dash.
   */
  addSound(ms: number, clipped = false) {
    const split = (this.bases.dot + this.bases.dash) / 2;
    const isDash = ms >= split;
    this.pending += isDash ? '-' : '.';
    if (clipped) return;
    this.#adapt(isDash ? 'dash' : 'dot', ms);
    this.#refit(ms);
  }

  /**
   * A silence ended, which is to say the next press arrived.
   *
   * @param ms - how long the key was up
   */
  addSilence(ms: number) {
    // A silence shorter than the split cannot have closed the letter, because
    // the timer that closes it does not fire until the split. The check is
    // defensive: if it somehow did, the letter is already on screen and it
    // stays there.
    this.#refitSilence(ms);

    if (ms < this.letterSplit && !this.#closed) {
      // An element gap is one unit and so is a dot, so there is nothing here
      // the sounds have not already said better, and nothing to do.
      //
      // An earlier version took a run of them as evidence that the letter gap
      // base was stale and walked it back towards three dots. That fires inside
      // every letter of three elements or more, so it was not a recovery from
      // staleness at all: it was a standing pull towards the textbook 1:3, on
      // an operator whose letters really are six dots apart. It held the split
      // at two dots, which is exactly where a loose hand's element gaps live.
      return;
    }

    this.#commit();
    if (ms >= this.wordSplit) {
      this.#wordBreak = true;
      // A word gap is seven units where a letter gap is three, so it says the
      // same thing in a different multiple and is worth three sevenths of
      // itself. Discarding it instead — which is what this did at first, on the
      // grounds that a seven would drag a three upwards — is what made the
      // whole estimate a one-way ratchet: when the letter gap base is too low,
      // the operator's real letter gaps come in above the word split, and
      // throwing those away leaves nothing but the misread element gaps below
      // it to feed on. The estimate could then only ever fall, and every step
      // down lowered the split that decided what fell into it. That is the
      // "hhhh reads as eeee, and the wpm climbs to fifty" failure: not a
      // threshold slightly off, but an estimate with no way back up.
      this.#adapt('charGap', (ms * 3) / 7);
    } else if (ms >= this.letterSplit && ms <= this.bases.dot * CREDIBLE_CHAR_GAP) {
      // A letter gap is three of the operator's units, so one that is longer
      // than about five of them is not a letter gap that we measured slightly
      // wrong: it is a word gap that arrived while the letter gap base was
      // still describing an older, slower hand, and letting it in would move
      // that base further from the truth rather than closer. The separator has
      // already been drawn as a letter break, which is a cosmetic error; taking
      // the measurement would turn it into a garbled next word.
      this.#adapt('charGap', ms);
    }
    this.#closed = false;
  }

  /**
   * The operator has been quiet for `letterSplit`: the character is finished.
   *
   * Called by the keyer's letter timer. It commits what is on screen; the
   * silence itself is measured later, by `addSilence`, when it ends.
   */
  closeLetter() {
    if (!this.pending) return;
    this.#commit();
    this.#closed = true;
  }

  /* ---------------------------------------------------------------- *
   * The estimates
   * ---------------------------------------------------------------- */

  #commit() {
    if (!this.pending) return;
    this.letters.push({ code: this.pending, wordBreak: this.#wordBreak });
    this.pending = '';
    this.#wordBreak = false;
  }

  #adapt(kind: keyof SpeedBases, value: number) {
    const base = this.bases[kind];
    if (value > base * OUTLIER || value < base / OUTLIER) return;

    const alpha = this.#adapted < PRIMING_ELEMENTS ? ALPHA_PRIMING : ALPHA;
    this.bases[kind] = base + alpha * (value - base);
    this.#adapted++;

    if (kind === 'charGap') {
      // the letter gap is the one estimate the sounds cannot supply, so it is
      // kept, but only within reach of them
      this.bases.charGap = clamp(
        this.bases.charGap,
        this.bases.dot * MIN_RATIO,
        this.bases.dot * MAX_CHAR_RATIO
      );
      return;
    }


    const n = ++this.#sounds;
    this.#last[kind] = n;
    this.#drag(kind, n);
    this.#couple(kind === 'dot');
    // The letter gap is measured in the operator's units, so a change of speed
    // moves it whether or not a letter gap has been seen since. This is a bound
    // and not a pull: an estimate inside the band is left exactly where the
    // operator put it, which is the difference between following a hand and
    // correcting it.
    this.bases.charGap = clamp(
      this.bases.charGap,
      this.bases.dot * MIN_RATIO,
      this.bases.dot * MAX_CHAR_RATIO
    );
  }

  /**
   * Pulls a base that has gone unobserved towards the one that has not.
   *
   * This is the difference between a decoder that recovers from a bad prior and
   * one that cannot, and the reason is that the two errors reinforce each
   * other. Suppose the slider says 12wpm and the operator keys at 25: every
   * sound is shorter than the prior expects, so every one of them is read as a
   * dot. The dot base does follow the hand down — but the dash base is never
   * fed, because nothing was ever called a dash, so it stays at the prior and
   * holds the split up at a value nothing can cross. The decoder reads one
   * endless letter of dots, and no amount of keying gets it out.
   *
   * So a base that has not been seen for a few elements stops being evidence
   * and starts being an assumption, and the assumption is the 1:3 of the
   * definition, taken from the base that *is* being fed. As soon as one real
   * dash gets through, the dash base is fed again, this stops, and the two go
   * back to describing the operator's own ratio rather than the textbook one.
   *
   * The letter gap needs none of this: it is bounded against the dot on every
   * sound, so it cannot be left describing a speed the operator has left.
   */
  #drag(measured: 'dot' | 'dash', n: number) {
    const partner = measured === 'dot' ? 'dash' : 'dot';
    if (n - this.#last[partner] <= STALE_AFTER) return;
    const nominal = measured === 'dot' ? this.bases.dot * 3 : this.bases.dash / 3;
    this.bases[partner] += DRAG * (nominal - this.bases[partner]);
  }

  /**
   * Re-fits the dot and the dash to the last few presses, whenever those
   * presses obviously come in two sizes.
   *
   * This is what catches a prior that is wrong by enough that the classification
   * cannot correct itself. Told 25wpm and keyed at 8, every press is read as a
   * dash and the bases settle happily an octave out — "t t t t t" really is what
   * those timings say at 25wpm, so there is no local evidence of the mistake and
   * `#drag` only helps it along, pulling the dot down to a third of a dash that
   * is itself a dot. Told 12 and keyed at 20 the same thing happens the other
   * way up, and a dash-heavy word like "cq" stays unreadable for a line.
   *
   * The window does not care what anything was read as. It looks at the raw
   * durations of the last few presses and asks whether they fall into two
   * groups with clear air between them: if they do, the short ones are dots and
   * the long ones dashes whatever the bases believe, and their means are the
   * bases. Six presses is under two characters, so a bad prior costs a letter or
   * so and then stops costing anything.
   *
   * "Clear air" is the whole of it, and an earlier version had it wrong. Merely
   * asking whether the longest press was twice the shortest is not a test for
   * two groups — it is a test for spread, and a hand that keys nothing but dots
   * with a 40% wobble passes it every time. That version tore a single cloud of
   * dots in half, called the bottom half the dot base, and reported a speed half
   * again too fast; the split fell with it, and letters came apart. So the gap
   * between the groups has to be real: nothing may sit in the middle, each side
   * needs more than one press to its name, and what comes out has to look like a
   * dot and a dash rather than two arbitrary piles.
   *
   * A window with only one kind of sound in it — a word of dots — has no gap in
   * it, nothing fires, and `#drag` is what keeps the dash honest until a real
   * one turns up.
   */
  #refit(ms: number) {
    this.#window.push(ms);
    if (this.#window.length > WINDOW) this.#window.shift();

    const groups = cluster(this.#window, WINDOW_MIN, SEPARATION);
    if (groups.length < 2) return;

    // everything above the first break is a dash: a window only ever holds two
    // kinds of press, so a third group is one clumsy one and belongs with them
    const long = groups.slice(1).flat();
    // and neither side may rest on a single press
    if (groups[0].length < 2 || long.length < 2) return;

    const dot = clamp(mean(groups[0]), MIN_DOT, MAX_DOT);
    const dash = mean(long);
    // a pair that is not a plausible 1:3 is two clusters of something else and
    // is left alone
    if (dash < dot * MIN_RATIO || dash > dot * MAX_RATIO) return;
    this.bases.dot = dot;
    this.bases.dash = dash;
  }

  /**
   * The same, for the silences: where does this operator stop a letter?
   *
   * The letter gap is the one estimate with no clean source. A dot is measured
   * by every press that is a dot; the letter gap is measured only by silences
   * that were *already read as* letter gaps, and when the split is in the wrong
   * place that is a mixture of real letter gaps and element gaps that fell over
   * the line. The mean of a mixture sits between its parts, so the estimate
   * settles somewhere in the middle of the two things it was supposed to
   * separate, and it takes the split down with it. That is the whole of the
   * reported bug: an H a long way into a message reading as four Es, the
   * measured speed climbing as the split collapses, and the operator having to
   * key faster and faster to stay ahead of it.
   *
   * The way out is to stop asking the classification. A person keying loosely
   * still leaves two clearly different silences — two dits between elements and
   * six between letters is sloppy, but it is not ambiguous — and those two
   * groups are visible in the raw durations whatever the bases currently think.
   * So the window is grouped, and the second group up is the letter gap.
   *
   * The second group, specifically, and not the top one: the silences hold
   * three populations, not two, and the widest air in them is usually the one
   * before the word gaps. Taking the top group would set the letter gap to a
   * word gap and run every word together into one character.
   */
  #refitSilence(ms: number) {
    this.#silences.push(ms);
    if (this.#silences.length > SILENCE_WINDOW) this.#silences.shift();

    const groups = cluster(this.#silences, SILENCE_WINDOW_MIN, SILENCE_SEPARATION);
    if (groups.length < 2) return;
    // the element gaps and the letter gaps both have to be a habit. What sits
    // above them does not matter here — a window usually holds one word gap and
    // it must not invalidate the two groups that were wanted.
    if (groups[0].length < 2 || groups[1].length < 2) return;

    const charGap = mean(groups[1]);
    // it still has to be a letter gap of this operator's hand, or it is two
    // groups of something else
    if (charGap < this.bases.dot * MIN_RATIO || charGap > this.bases.dot * MAX_CHAR_RATIO) return;
    this.bases.charGap = charGap;
  }

  /**
   * Keeps the dot and the dash in proportion, and inside the range of speeds a
   * person keys at.
   *
   * The base that was just updated is the measured one, so it stays where the
   * operator put it and the other one is the one that moves.
   */
  #couple(dotWasMeasured: boolean) {
    if (dotWasMeasured) {
      const dot = clamp(this.bases.dot, MIN_DOT, MAX_DOT);
      this.bases.dot = dot;
      this.bases.dash = clamp(this.bases.dash, dot * MIN_RATIO, dot * MAX_RATIO);
    } else {
      const dash = clamp(this.bases.dash, MIN_DOT * MIN_RATIO, MAX_DOT * MAX_RATIO);
      this.bases.dash = dash;
      this.bases.dot = clamp(this.bases.dot, dash / MAX_RATIO, dash / MIN_RATIO);
    }
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Splits durations into the groups the hand actually made.
 *
 * Sorted, then broken wherever one duration is `separation` times the one below
 * it — clear air, in other words, of a width no plausible wobble reaches
 * across. A window with one kind of thing in it comes back as one group, which
 * is the common case and means "nothing to say".
 *
 * Whether a group is a population or a single clumsy press is left to the
 * caller, because it depends which group: a lone press between the dots and the
 * dashes is noise, but a lone word gap above two healthy groups of element and
 * letter gaps is just a word gap, and must not throw the rest away.
 */
function cluster(values: number[], minimum: number, separation: number): number[][] {
  if (values.length < minimum) return [];

  const sorted = [...values].sort((a, b) => a - b);
  const groups: number[][] = [[sorted[0]]];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] >= sorted[i - 1] * separation) groups.push([]);
    groups[groups.length - 1].push(sorted[i]);
  }
  return groups;
}

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}
