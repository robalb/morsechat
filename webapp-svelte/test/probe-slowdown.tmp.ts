/**
 * Five scoreboards at once, for tuning lib/morse/scale.ts:
 *
 *   pace       a hand that slows down, elements and silences together
 *   pause      a hand that keeps its elements and stretches only the silences
 *   synthetic  110 generated hands, the set test/probe-variants.tmp.ts uses
 *   generated  the 110 of test/synth.ts, which the golden records are built on
 *   corpus     the hand-keyed recordings, which are the ground truth
 *
 * The first two are what this file was added for. A hand that starts fast and
 * slows down keys an `h` whose presses are longer than the dashes it was keying
 * a second ago, and a decoder anchored to the speed it has been believing reads
 * them as dashes — or, where the gaps stretch past its letter boundary, as four
 * separate `e`s. Both were what it did before `COMMITTED_WEIGHT`:
 *
 *                        pace     pause    synthetic  generated  corpus
 *   weighing the past     8/42     1/18      103/110     91/110     7/7
 *   as `COMMITTED_WEIGHT` 10/42   16/18      103/110     90/110     7/7
 *
 * `static` in each row is lib/morse/scale.ts run over the finished buffer, which
 * is the ceiling for a message keyed at one speed and not a ceiling at all for
 * one keyed at two: it scores 6/42 on `pace` itself.
 *
 *   node --experimental-strip-types --import ./test/loader.mjs test/probe-slowdown.tmp.ts
 */
import getDialect from '$lib/utils/dialects';
import { ScaleDecoder, decodeTimings } from '$lib/morse/scale';
import { SAVED_RECORDINGS } from '$lib/playground/recordings';

import { synth, hand, type Hand } from './synth.ts';
import { CASES as GOLDEN_CASES } from './synth.ts';

const DIALECT = getDialect('international');
const isCharacter = (code: string) => Object.hasOwn(DIALECT.table, code);
const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);
const TICK = 16;

const toText = (line: string) =>
  line.split(' ').filter((c) => c && c !== '/').map((c) => DIALECT.table[c] ?? `[${c}]`).join('');

function live(buffer: number[], wpm: number): string {
  const d = new ScaleDecoder(100, { isCharacter });
  d.reset(1200 / clamp(wpm, 1, 200));
  const idle = (total: number) => {
    for (let e = TICK; e <= total; e += TICK) {
      d.idle(e);
      if (e >= d.wordSplit) d.flush();
    }
  };
  for (const [i, ms] of buffer.entries()) {
    if (i % 2 === 0) d.addSound(ms);
    else { idle(ms); d.addSilence(ms); }
  }
  idle(4000);
  return toText(d.visible.map((l) => l.code).join(' '));
}

const still = (buffer: number[]) => toText(decodeTimings(buffer, { isCharacter }));

interface Case { id: string; buffer: number[]; wpm: number; want: string }

/* ---- the generated hands ---- */
const MESSAGES = ['m','mnat','to','ton','oat','omen','tom','meno','no more','go to town','e','et','is',
  'hello world','sos','the quick','eat','seen','test','a test','cq de morsechat','this is a test'];
const HANDS: Record<string, Hand> = {
  textbook: hand(), sloppy: hand({ jitter: 0.3 }),
  heavy_dash: hand({ wpm: 20, jitter: 0.2, dash: 7, letterGap: 5, wordGap: 12 }),
  slow: hand({ wpm: 5, jitter: 0.12 }), fast: hand({ wpm: 35, jitter: 0.12 }),
};
const SYNTHETIC: Case[] = [];
for (const msg of MESSAGES) for (const [name, h] of Object.entries(HANDS)) {
  const seed = [...`${msg}/${name}`].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  SYNTHETIC.push({ id: `${msg}/${name}`, buffer: synth(msg, h, seed), wpm: h.wpm, want: msg.replace(/\s+/g, '') });
}

/* ---- the corpus. `-` is a recording whose expected text has not been typed in
 * yet: it is shown, not scored ---- */
const CORPUS: Case[] = SAVED_RECORDINGS.filter((r) => r.expected.trim() && r.expected.trim() !== '-').map((r) => ({
  id: r.id, buffer: r.buffer, wpm: r.wpm, want: r.expected.replace(/\s+/g, ''),
}));
const UNMARKED = SAVED_RECORDINGS.filter((r) => r.expected.trim() === '-');

/* ---- a hand that changes pace mid-message ----
 *
 * Two ways it happens, and the corpus has one of each. `pace` is the whole hand
 * slowing down, elements and silences together. `pause` is the hand keying the
 * same elements and stretching only the silences between them — which is what
 * rmswwaq0ex9 does, and what an operator does when they start thinking.
 */
const PAIRS = [['sos', 'h'], ['sos', 'hi'], ['test', 'h'], ['sos', 'she'],
               ['hello', 'hello'], ['the quick', 'brown fox']];

const PACE: Case[] = [];
for (const [fast, slow] of [[25, 12], [25, 8], [30, 10], [20, 10], [25, 5], [10, 25], [12, 30]]) {
  for (const [first, second] of PAIRS) {
    const a = synth(first, hand({ wpm: fast, jitter: 0.1 }), 11);
    const b = synth(second, hand({ wpm: slow, jitter: 0.1 }), 22);
    PACE.push({
      id: `${fast}->${slow} ${first}+${second}`,
      // joined by a word gap of the speed the second half is keyed at
      buffer: [...a, Math.round((1200 / slow) * 7), ...b],
      // the slider is where the message started
      wpm: fast,
      want: (first + second).replace(/\s+/g, ''),
    });
  }
}

const PAUSE: Case[] = [];
for (const gaps of [2, 3, 4]) {
  for (const [first, second] of PAIRS) {
    const wpm = 20;
    const a = synth(first, hand({ wpm, jitter: 0.1 }), 11);
    // same dot, same dash: only the silences grow
    const b = synth(second, hand({ wpm, jitter: 0.1, letterGap: 3 * gaps, wordGap: 7 * gaps }), 22);
    const stretched = b.map((ms, i) => (i % 2 === 0 ? ms : Math.round(ms * (ms < (1200 / wpm) * 2 ? gaps : 1))));
    PAUSE.push({
      id: `x${gaps} ${first}+${second}`,
      buffer: [...a, Math.round((1200 / wpm) * 7 * gaps), ...stretched],
      wpm,
      want: (first + second).replace(/\s+/g, ''),
    });
  }
}

function score(name: string, cases: Case[], show = false) {
  let liveOk = 0;
  let stillOk = 0;
  for (const c of cases) {
    const got = live(c.buffer, c.wpm);
    const fixed = still(c.buffer);
    if (got === c.want) liveOk++;
    if (fixed === c.want) stillOk++;
    if (show && got !== c.want) {
      console.log(`  ${c.id.padEnd(26)} want=${c.want.padEnd(14)} live=${got.padEnd(16)} static=${fixed}`);
    }
  }
  console.log(`${name.padEnd(11)} live ${String(liveOk).padStart(3)}/${cases.length}   static ${String(stillOk).padStart(3)}/${cases.length}`);
}

const show = process.argv.includes('--show');
if (show) console.log('--- pace, where the live decoder misses');
score('pace', PACE, show);
if (show) console.log('--- pause, where the live decoder misses');
score('pause', PAUSE, show);
score('synthetic', SYNTHETIC);
score('generated', GOLDEN_CASES.filter((c) => !c.id.startsWith('edge/')).map((c) => ({
  id: c.id, buffer: c.buffer, wpm: c.wpm, want: c.text.replace(/\s+/g, ''),
})), show);
score('corpus', CORPUS);
for (const r of UNMARKED) {
  console.log(`\n${r.id} (not scored: no expected text)`);
  console.log(`  live   ${live(r.buffer, r.wpm)}`);
  console.log(`  static ${still(r.buffer)}`);
}
