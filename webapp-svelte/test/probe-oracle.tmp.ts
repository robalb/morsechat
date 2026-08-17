/**
 * Search error or model error?
 *
 * The question this answers: when lib/morse/scale.ts reads a hand wrong, is the
 * right reading *in* its candidate set and merely priced too high — or is it not
 * in the set at all? Only the first kind is something a learned scorer could fix,
 * because learning replaces the pricing and nothing else. The second kind is the
 * parameterisation, and no amount of fitting weights touches it.
 *
 * For every case: enumerate exactly the candidates `fit` enumerates, read each
 * one, and ask whether any of them says what the operator meant.
 *
 *   OK        the cheapest reading is the right one
 *   RANK      the right reading is in the set, and something else was cheaper
 *   MISS      no candidate in the set reads this hand correctly
 *
 * RANK is the ceiling on what re-pricing (by hand or by gradient) can buy. MISS
 * is the floor no re-pricing can go under.
 *
 *                     OK          RANK        MISS
 *   synthetic  none   101/110     9           0
 *   synthetic  prior  108/110     2           0
 *   pace       prior   10/42      8          24
 *   pause      prior    5/18      1          12
 *   corpus     prior    6/7       0           1
 *
 * Five of the nine static RANK cases are `m` at every speed, priced at 0.00
 * against `i` at 0.00 — a tie, which is §3 of the spec and not a mis-weighting.
 * What is left over the single-speed hands is two cases in a hundred and ten.
 * The pace and pause rows are the other story: over half of those messages have
 * no correct reading at any single scale at all, which is a limit of the
 * parameterisation and not of the pricing.
 *
 *   node --experimental-strip-types --import ./test/loader.mjs test/probe-oracle.tmp.ts [-v]
 *
 * `oracle-core.tmp.ts` is lib/morse/scale.ts with its internals exported, and it
 * is a *copy*: regenerate it before trusting a run against a changed decoder.
 *
 *   sed -e 's/^function fit(/export function fit(/' \
 *       -e 's/^function readAt(/export function readAt(/' \
 *       -e 's/^const SHAPES:/export const SHAPES:/' \
 *       -e 's/^function units(/export function units(/' \
 *       -e 's/^interface Scale {/export interface Scale {/' \
 *       -e 's/^interface Reading {/export interface Reading {/' \
 *       src/lib/morse/scale.ts > test/oracle-core.tmp.ts
 */
import getDialect from '$lib/utils/dialects';
import { SAVED_RECORDINGS } from '$lib/playground/recordings';

import { fit, readAt, units, SHAPES } from './oracle-core.tmp.ts';
import { synth, hand, type Hand } from './synth.ts';

const DIALECT = getDialect('international');
const isCharacter = (code: string) => Object.hasOwn(DIALECT.table, code);

const toText = (codes: string[]) =>
  codes.map((c) => DIALECT.table[c] ?? `[${c}]`).join('');

interface Case {
  id: string;
  buffer: number[];
  wpm: number;
  want: string;
}

/* ---- the same case sets probe-slowdown.tmp.ts scores ---- */
const MESSAGES = ['m', 'mnat', 'to', 'ton', 'oat', 'omen', 'tom', 'meno', 'no more', 'go to town',
  'e', 'et', 'is', 'hello world', 'sos', 'the quick', 'eat', 'seen', 'test', 'a test',
  'cq de morsechat', 'this is a test'];
const HANDS: Record<string, Hand> = {
  textbook: hand(),
  sloppy: hand({ jitter: 0.3 }),
  heavy_dash: hand({ wpm: 20, jitter: 0.2, dash: 7, letterGap: 5, wordGap: 12 }),
  slow: hand({ wpm: 5, jitter: 0.12 }),
  fast: hand({ wpm: 35, jitter: 0.12 }),
};

const SYNTHETIC: Case[] = [];
for (const msg of MESSAGES) {
  for (const [name, h] of Object.entries(HANDS)) {
    const seed = [...`${msg}/${name}`].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
    SYNTHETIC.push({ id: `${msg}/${name}`, buffer: synth(msg, h, seed), wpm: h.wpm, want: msg.replace(/\s+/g, '') });
  }
}

const CORPUS: Case[] = SAVED_RECORDINGS
  .filter((r) => r.expected.trim() && r.expected.trim() !== '-')
  .map((r) => ({ id: r.id, buffer: r.buffer, wpm: r.wpm, want: r.expected.replace(/\s+/g, '').toLowerCase() }));

const PAIRS = [['sos', 'h'], ['sos', 'hi'], ['test', 'h'], ['sos', 'she'],
               ['hello', 'hello'], ['the quick', 'brown fox']];

const PACE: Case[] = [];
for (const [fast, slow] of [[25, 12], [25, 8], [30, 10], [20, 10], [25, 5], [10, 25], [12, 30]]) {
  for (const [first, second] of PAIRS) {
    const a = synth(first, hand({ wpm: fast, jitter: 0.1 }), 11);
    const b = synth(second, hand({ wpm: slow, jitter: 0.1 }), 22);
    PACE.push({
      id: `${fast}->${slow} ${first}+${second}`,
      buffer: [...a, Math.round((1200 / slow) * 7), ...b],
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

/* ------------------------------------------------------------------ */

type Verdict = 'OK' | 'RANK' | 'MISS';

interface Result {
  verdict: Verdict;
  got: string;
  /** cost of the reading the fit chose */
  chosen: number;
  /** cheapest cost among candidates that read correctly, if any */
  correct: number | null;
  /** how many candidates were cheaper than the cheapest correct one */
  rank: number;
}

/**
 * @param prior - the dot the caller believed in, or null for the static read.
 * With a prior this is the dynamic decoder's single-shot equivalent: same
 * candidates, same pricing, whole message at once.
 */
function judge(one: Case, prior: number | null): Result {
  const events = one.buffer.map((ms, i) => ({ ms, sound: i % 2 === 0 }));
  const presses = one.buffer.filter((_, i) => i % 2 === 0);
  const options = { isCharacter, idle: Infinity };

  let chosenCost = Infinity;
  let got = '';
  let correct: number | null = null;
  const costs: number[] = [];

  for (const unit of units(presses, prior)) {
    for (const shape of SHAPES) {
      const scale = { unit, dash: unit * shape.dash, letter: unit * shape.letter, word: unit * shape.word };
      const reading = readAt(events, scale, options);
      let cost = reading.cost;
      if (prior !== null) {
        const drift = Math.log(Math.max(reading.dot, 1) / prior);
        cost += 3 * drift * drift;
      }
      const text = toText(reading.letters.map((l) => l.code)) + toText(reading.pending ? [reading.pending] : []);
      costs.push(cost);
      if (cost < chosenCost) {
        chosenCost = cost;
        got = text;
      }
      if (text === one.want && (correct === null || cost < correct)) correct = cost;
    }
  }

  const verdict: Verdict = got === one.want ? 'OK' : correct === null ? 'MISS' : 'RANK';
  const rank = correct === null ? -1 : costs.filter((c) => c < correct).length;
  return { verdict, got, chosen: chosenCost, correct, rank };
}

function score(name: string, cases: Case[], withPrior: boolean) {
  const tally: Record<Verdict, number> = { OK: 0, RANK: 0, MISS: 0 };
  const misses: string[] = [];
  const ranks: string[] = [];

  for (const one of cases) {
    const prior = withPrior ? 1200 / Math.min(Math.max(one.wpm, 1), 200) : null;
    const result = judge(one, prior);
    tally[result.verdict]++;
    if (result.verdict === 'MISS') misses.push(`    ${one.id}  want "${one.want}"  best "${result.got}"`);
    if (result.verdict === 'RANK') {
      ranks.push(
        `    ${one.id}  want "${one.want}"  got "${result.got}"` +
          `  cost ${result.chosen.toFixed(2)} vs ${result.correct!.toFixed(2)} (${result.rank} cheaper)`
      );
    }
  }

  const total = cases.length;
  const pct = (n: number) => `${((100 * n) / total).toFixed(0)}%`;
  console.log(
    `${name.padEnd(12)}${withPrior ? 'prior' : 'none '}  ` +
      `OK ${String(tally.OK).padStart(3)}/${total} (${pct(tally.OK)})   ` +
      `RANK ${String(tally.RANK).padStart(3)} (${pct(tally.RANK)})   ` +
      `MISS ${String(tally.MISS).padStart(3)} (${pct(tally.MISS)})`
  );
  return { ranks, misses };
}

for (const withPrior of [false, true]) {
  console.log(`\n--- ${withPrior ? 'with the declared speed as prior' : 'no speed reference (static)'} ---`);
  const sets: [string, Case[]][] = [['synthetic', SYNTHETIC], ['pace', PACE], ['pause', PAUSE], ['corpus', CORPUS]];
  for (const [name, cases] of sets) {
    const { ranks, misses } = score(name, cases, withPrior);
    if (process.argv.includes('-v')) {
      for (const line of ranks) console.log(line);
      for (const line of misses) console.log(line);
    }
  }
}
