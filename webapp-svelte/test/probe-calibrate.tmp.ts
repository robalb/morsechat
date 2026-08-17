/**
 * What the seven real hands actually are, so that test/hands.ts can be set to
 * generate hands like them rather than like the textbook.
 *
 *   node --experimental-strip-types --import ./test/loader.mjs test/probe-calibrate.tmp.ts
 */
import getDialect from '$lib/utils/dialects';
import { SAVED_RECORDINGS } from '$lib/playground/recordings';

import { align, difficulty, measure } from './difficulty.ts';
import { CASES } from './synth.ts';

const DIALECT = getDialect('international');

const row = (id: string, m: ReturnType<typeof measure>, d: ReturnType<typeof difficulty>) =>
  `${id.padEnd(22)} ${m!.wpm.toFixed(1).padStart(5)}wpm  dash ${m!.dash.toFixed(2).padStart(5)}  ` +
  `gaps ${m!.elementGap.toFixed(2)}/${m!.letterGap.toFixed(2)}/${m!.wordGap.toFixed(2).padStart(5)}  ` +
  `jitter ${m!.jitter.toFixed(2)}  |  d' ${(d.dash ?? NaN).toFixed(1).padStart(5)}/${(d.letter ?? NaN).toFixed(1).padStart(5)}/${(d.word ?? NaN).toFixed(1).padStart(5)}  ` +
  `D ${d.d.toFixed(2)}  bayes ${(100 * d.bayes).toFixed(1)}%`;

console.log('--- the corpus: seven hands, keyed by a person ---');
const spreads: number[] = [];
for (const r of SAVED_RECORDINGS) {
  const expected = r.expected.trim();
  if (!expected || expected === '-') continue;
  const classes = align(r.buffer, expected, DIALECT);
  if (classes === null) {
    console.log(`${r.id.padEnd(22)} does not align with "${expected}"`);
    continue;
  }
  const m = measure(classes);
  const d = difficulty(classes);
  if (m) {
    console.log(row(r.id, m, d));
    spreads.push(m.jitter);
  }
}

console.log('\n--- test/synth.ts, for comparison ---');
for (const one of CASES) {
  if (!one.text || one.buffer.length < 3) continue;
  const classes = align(one.buffer, one.text, DIALECT);
  if (classes === null) continue;
  const m = measure(classes);
  const d = difficulty(classes);
  if (m && one.id.endsWith('/textbook') === false && one.id.startsWith('hello')) console.log(row(one.id, m, d));
}

const sorted = [...spreads].sort((a, b) => a - b);
console.log(
  `\ncorpus jitter: min ${sorted[0]?.toFixed(2)} median ${sorted[Math.floor(sorted.length / 2)]?.toFixed(2)} max ${sorted.at(-1)?.toFixed(2)}`
);
