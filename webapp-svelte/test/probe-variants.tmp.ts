/**
 * Variants of lib/morse/window.ts, to isolate what actually breaks it on a
 * message that starts with a dash. Scored against 110 generated hands and the
 * corpus; window-static.ts is in the table as the reference.
 *
 *   A.  as-is                                                      48/110  4/7
 *   B.  no learning at all: the dot stays where the slider put it   75/110  3/7
 *   C.  learn only from a window that shows dots *and* dashes       74/110  6/7
 *   D.  C + a standing pull toward the declared wpm                 74/110  6/7
 *   E.  C + the whole history kept as evidence, not 12 events       79/110  5/7
 *   F.  A + the whole history kept as evidence                      48/110  4/7
 *   G.  C + the believed scale offered as a threshold candidate    105/110  5/7
 *   H/I G, but the scale candidate only where the data has none     94/84   4/7
 *   J1-3 G, but only the dash threshold gets the candidate          79/78/76 4/7
 *   K.  C + the scale offered as one coherent triple, not per-axis  93/110  5/7
 *
 * Read F against A: widening the evidence changes nothing, so the window size
 * is not what breaks it. Read C against A: gating the estimator is. Read J and
 * H against G: a candidate for one threshold without matching candidates for
 * the other two reads *worse* than none, which is the three-free-thresholds
 * parameterisation showing through.
 *
 *   node --experimental-strip-types --import ./test/loader.mjs \
 *     test/probe-variants.tmp.ts
 */
import getDialect from '$lib/utils/dialects';
import { read, search, splits, type KeyEvent, type Reading, type Thresholds } from '$lib/morse/window-core';
import { decodeTimings } from '$lib/morse/window-static';
import { synth, hand, type Hand } from './synth.ts';
import { SAVED_RECORDINGS } from '$lib/playground/recordings';

const DIALECT = getDialect('international');
const isCharacter = (code: string) => Object.hasOwn(DIALECT.table, code);

const FLICKER_LETTERS = 4, HORIZON = 1, KEEP_EVENTS = 12, MAX_EVENTS = 40;
const MIN_DOT = 20, MAX_DOT = 600, WORD_COST = 1.2, PRIOR_COST = 0.8;
const ALPHA = 0.4, MAX_STEP = 0.25;
const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);

type Mode = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J1' | 'J2' | 'J3' | 'K';
/** the dot multiple a mode J run puts its extra dash candidate at */
const J_AT: Record<string, number> = { J1: 1.73, J2: 2.0, J3: 2.65 };

class Variant {
  letters: { code: string; wordBreak: boolean }[] = [];
  #events: KeyEvent[] = [];
  #kept = 0; #idle = 0; #dot: number; #settled = false;
  #anchor: number;
  #reading: Reading;
  mode: Mode;
  constructor(dot: number, mode: Mode) {
    this.mode = mode;
    this.#dot = clamp(dot, MIN_DOT, MAX_DOT);
    this.#anchor = this.#dot;
    this.#reading = this.#empty();
  }
  #empty(): Reading {
    return { cost: 0, letters: [], pending: '', dot: this.#dot,
      thresholds: { dash: this.#dot * 2, letter: this.#dot * 2, word: this.#dot * 5 } };
  }
  get dot() { return this.#dot; }
  get letterSplit() { const l = this.#reading.thresholds.letter; return Number.isFinite(l) ? l : this.#dot * 3; }
  get wordSplit() { const w = this.#reading.thresholds.word; return Number.isFinite(w) ? w : this.letterSplit * 3; }
  get visible() { return this.#settled ? this.letters : [...this.letters, ...this.#reading.letters]; }
  addSound(ms: number) { this.#events.push({ ms, sound: true }); this.#idle = 0; this.#update(true); }
  addSilence(ms: number) { if (!this.#events.length) return; this.#events.push({ ms, sound: false }); this.#idle = 0; this.#update(true); }
  idle(ms: number) { this.#idle = ms; this.#update(false); }
  flush() { this.#update(false); this.#freeze(this.#reading.letters.length); }
  #update(learn: boolean) {
    this.#reading = this.#best(learn);
    if (this.letters.length + this.#reading.letters.length > FLICKER_LETTERS) this.#settled = true;
    const spare = this.#reading.letters.length - HORIZON;
    if (this.#settled && spare > 0) this.#freeze(spare);
    else if (this.#events.length > MAX_EVENTS && this.#reading.letters.length > 0) this.#freeze(1);
  }
  #freeze(count: number) {
    const frozen = this.#reading.letters.slice(0, count);
    if (!frozen.length) return;
    for (const l of frozen) this.letters.push({ code: l.code, wordBreak: l.wordBreak });
    this.#kept = frozen[frozen.length - 1].end;
    const keep = this.mode === 'E' || this.mode === 'F' ? Infinity : KEEP_EVENTS;
    const drop = Math.max(0, this.#kept - keep);
    if (drop > 0) { this.#events = this.#events.slice(drop); this.#kept -= drop; }
    this.#reading = this.#best(false);
  }
  /** does this reading actually pin the scale? both classes present and separated */
  #identified(t: Thresholds): boolean {
    let dots = 0, dashes = 0;
    for (const e of this.#events) if (e.sound) (e.ms >= t.dash ? dashes++ : dots++);
    return dots > 0 && dashes > 0;
  }
  #best(learn: boolean): Reading {
    if (!this.#events.length) return this.#empty();
    const sounds = this.#events.filter((e) => e.sound).map((e) => e.ms);
    const gaps = this.#events.filter((e) => !e.sound).map((e) => e.ms);
    const best = this.mode === 'G' || this.mode === 'H' || this.mode === 'I' || this.mode.startsWith('J') || this.mode === 'K'
      ? this.#searchWithPrior(sounds, gaps)
      : search(sounds, gaps, (t) => this.#read(t));
    if (best === null) return this.#empty();
    const mayLearn =
      this.mode === 'A' || this.mode === 'F' ? true :
      this.mode === 'B' ? false :
      this.#identified(best.thresholds);
    if (learn && mayLearn && best.dot > 0) {
      const moved = this.#dot + ALPHA * (best.dot - this.#dot);
      const step = clamp(moved, this.#dot * (1 - MAX_STEP), this.#dot * (1 + MAX_STEP));
      this.#dot = clamp(step, MIN_DOT, MAX_DOT);
    }
    return best;
  }
  /** the data's own splits, plus the ones the believed speed implies: a window
   * with too few durations to show a jump still has a scale to be read at */
  #searchWithPrior(sounds: number[], gaps: number[]): Reading | null {
    const u = this.#dot;
    // G: always. H: always for the dash, only as a fallback for the gaps.
    // I: only as a fallback, i.e. when the durations offer no jump at all.
    const bare = (xs: number[]) => xs.length <= 1;
    const withPrior = (xs: number[], p: number, always: boolean) =>
      always || bare(xs) ? [...new Set([...xs, p])] : xs;
    const rawS = splits(sounds), rawG = splits(gaps);
    const J = this.mode.startsWith('J');
    if (this.mode === 'K') {
      // the data's own cross-product, plus ONE coherent triple: the whole
      // reading the believed scale implies, offered as a unit
      let bestK: Reading | null = null;
      const tryOne = (t: Thresholds) => {
        const r = this.#read(t);
        if (bestK === null || r.cost < bestK.cost) bestK = r;
      };
      for (const dash of rawS) for (const letter of rawG)
        for (const word of splits(gaps, letter)) tryOne({ dash, letter, word });
      tryOne({ dash: u * 2, letter: u * 2, word: u * 5 });
      return bestK;
    }
    const dashes = J
      ? [...new Set([...rawS, u * J_AT[this.mode]])]
      : withPrior(rawS, u * 2, this.mode === 'G' || this.mode === 'H');
    const letters = J ? rawG : withPrior(rawG, u * 2, this.mode === 'G');
    let best: Reading | null = null;
    for (const dash of dashes) for (const letter of letters) {
      const rawW = splits(gaps, letter);
      const words = (J ? rawW : withPrior(rawW, u * 5, this.mode === 'G')).filter((w) => w > letter);
      for (const word of words) {
        const r = this.#read({ dash, letter, word });
        if (best === null || r.cost < best.cost) best = r;
      }
    }
    return best;
  }

  #read(t: Thresholds): Reading {
    const r = read(this.#events, t, { isCharacter, wordCost: WORD_COST, frozen: this.#kept, idle: this.#idle });
    if (r.dot > 0) {
      const drift = Math.log(r.dot / this.#dot);
      r.cost += PRIOR_COST * drift * drift * this.#events.length;
      if (this.mode === 'D') {
        // an extra pull toward what the operator declared, which never moves
        const off = Math.log(r.dot / this.#anchor);
        r.cost += 0.35 * off * off * this.#events.length;
      }
    }
    return r;
  }
}

const TICK = 16;
const toText = (line: string) => line.split(' ').filter((c) => c && c !== '/').map((c) => DIALECT.table[c] ?? `[${c}]`).join('');
function runVariant(buffer: number[], wpm: number, mode: Mode): string {
  const d = new Variant(1200 / clamp(wpm, 1, 200), mode);
  const idle = (total: number) => { for (let e = TICK; e <= total; e += TICK) { d.idle(e); if (e >= d.wordSplit) d.flush(); } };
  for (const [i, ms] of buffer.entries()) {
    if (i % 2 === 0) d.addSound(ms);
    else { idle(ms); d.addSilence(ms); }
  }
  idle(4000);
  return toText(d.visible.map((l) => (l.wordBreak ? `/ ${l.code}` : l.code)).join(' '));
}

const MESSAGES = ['m','mnat','to','ton','oat','omen','tom','meno','no more','go to town','e','et','is',
  'hello world','sos','the quick','eat','seen','test','a test','cq de morsechat','this is a test'];
const HANDS: Record<string, Hand> = {
  textbook: hand(), sloppy: hand({ jitter: 0.3 }),
  heavy_dash: hand({ wpm: 20, jitter: 0.2, dash: 7, letterGap: 5, wordGap: 12 }),
  slow: hand({ wpm: 5, jitter: 0.12 }), fast: hand({ wpm: 35, jitter: 0.12 }),
};

const MODES: Mode[] = ['A','B','C','D','E','F','G','H','I','J1','J2','J3','K'];
const score: Record<string, number> = Object.fromEntries([...MODES, 'static'].map((m) => [m, 0]));
let total = 0;
const bad: string[] = [];
for (const msg of MESSAGES) for (const [hn, h] of Object.entries(HANDS)) {
  const seed = [...`${msg}/${hn}`].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const buffer = synth(msg, h, seed);
  const want = msg.replace(/\s+/g, '');
  total++;
  const got: Record<string, string> = {};
  for (const m of MODES) got[m] = runVariant(buffer, h.wpm, m);
  got.static = toText(decodeTimings(buffer, { isCharacter }));
  for (const k of Object.keys(score)) if (got[k] === want) score[k]++;
  if (got.K !== want)
    bad.push(`${(msg + '/' + hn).padEnd(22)} want=${want.padEnd(11)} A=${got.A.padEnd(11)} G=${got.G.padEnd(11)} K=${got.K.padEnd(11)} S=${got.static}`);
}
console.log(bad.join('\n'));
console.log(`\nsynthetic, out of ${total}:`, score);

// the corpus
const cs: Record<string, number> = Object.fromEntries([...MODES, 'static'].map((m) => [m, 0]));
const rows: string[] = [];
for (const r of SAVED_RECORDINGS.filter((r) => r.expected.trim())) {
  const want = r.expected.replace(/\s+/g, '');
  const got: Record<string, string> = {};
  for (const m of MODES) got[m] = runVariant(r.buffer, r.wpm, m);
  got.static = toText(decodeTimings(r.buffer, { isCharacter }));
  for (const k of Object.keys(cs)) if (got[k] === want) cs[k]++;
  rows.push(`${want.padEnd(24)} A=${got.A.padEnd(22)} G=${got.G.padEnd(22)} K=${got.K.padEnd(22)} S=${got.static}`);
}
console.log('\ncorpus:');
console.log(rows.join('\n'));
console.log(`corpus, out of ${SAVED_RECORDINGS.filter((r) => r.expected.trim()).length}:`, cs);
