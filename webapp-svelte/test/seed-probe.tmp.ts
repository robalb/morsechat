/** scratch: what the seed dot actually changes. Not a test. */
import getDialect from '$lib/utils/dialects';
import { WindowDecoder } from '$lib/morse/window';
import { renderLetters } from '$lib/morse/decode';
import { splits, read as coreRead, scatter } from '$lib/morse/window-core';
import { SAVED_RECORDINGS } from '$lib/playground/recordings';
import { synth, hand, CASES } from './synth.ts';

const DIALECT = getDialect('international');
const isCharacter = (code: string) => Object.hasOwn(DIALECT.table, code);
const TICK = 16;
const IDLE_MAX = 4000;

function read(buffer: number[], seedDot: number): string {
  const d = new WindowDecoder(seedDot, { isCharacter });
  const idle = (total: number) => {
    for (let e = TICK; e <= total; e += TICK) {
      d.idle(e);
      if (e >= d.wordSplit) d.flush();
    }
  };
  for (const [i, ms] of buffer.entries()) {
    if (i % 2 === 0) d.addSound(ms);
    else {
      idle(ms);
      d.addSilence(ms);
    }
  }
  idle(IDLE_MAX);
  return renderLetters(d.visible, d.preview, { dialect: DIALECT, showReadable: true });
}

const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
function agreement(got: string, want: string): number {
  const a = norm(got).replace(/ /g, '');
  const b = norm(want).replace(/ /g, '');
  if (!b) return 0;
  let same = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] === b[i]) same++;
  return same / Math.max(a.length, b.length);
}

/* ------------------------------------------------------------------ *
 * 1. why "m" is ".."
 * ------------------------------------------------------------------ */
const m = synth('m', hand({ wpm: 12 }));
console.log('"m" keyed at 12 wpm ->', JSON.stringify(m));
const sounds = m.filter((_, i) => i % 2 === 0);
const gaps = m.filter((_, i) => i % 2 === 1);
console.log('  dash-threshold candidates from those presses:', splits(sounds));
console.log('  gap-threshold candidates:', splits(gaps));

/** the cost window.ts gives a reading: the core's, plus the drift from the prior */
function priced(buffer: number[], dashAt: number, priorDot: number) {
  const events = buffer.map((ms, i) => ({ ms, sound: i % 2 === 0 }));
  const r = coreRead(events, { dash: dashAt, letter: Infinity, word: Infinity }, {
    isCharacter,
    wordCost: 1.2,
    idle: Infinity,
  });
  const drift = Math.log(r.dot / priorDot);
  return { code: r.letters.map((l) => l.code).join(' '), cost: r.cost + 0.8 * drift * drift * events.length, implied: Math.round(r.dot) };
}
for (const prior of [300, 100, 50]) {
  const asDots = priced(m, Infinity, prior);
  const asDashes = priced(m, 1.73 * prior, prior);
  console.log(
    `  prior dot ${prior}ms: as dots ${JSON.stringify(asDots.code)} cost ${asDots.cost.toFixed(2)} (implies ${asDots.implied}ms)` +
      ` | as dashes ${JSON.stringify(asDashes.code)} cost ${asDashes.cost.toFixed(2)} (implies ${asDashes.implied}ms)`,
  );
}

/* ------------------------------------------------------------------ *
 * 2. does the seed matter at all, over the whole corpus?
 * ------------------------------------------------------------------ */
const CORPUS = [
  ...CASES.map((c) => ({ id: c.id, text: c.text, buffer: c.buffer, wpm: c.wpm })),
  ...SAVED_RECORDINGS.map((r) => ({ id: `corpus/${r.id}`, text: r.expected, buffer: r.buffer, wpm: r.wpm })),
];

const SEEDS: { name: string; dot: (wpm: number) => number }[] = [
  { name: 'slider (today)', dot: (wpm) => 1200 / wpm },
  { name: 'always 5 wpm', dot: () => 240 },
  { name: 'always 8 wpm', dot: () => 150 },
  { name: 'always 20 wpm', dot: () => 60 },
  { name: 'always 35 wpm', dot: () => 34 },
  { name: 'half the hand', dot: (wpm) => 2400 / wpm },
  { name: 'twice the hand', dot: (wpm) => 600 / wpm },
];

console.log('\nthe whole corpus, read from each seed:\n');
console.log('seed'.padEnd(16) + 'exact'.padStart(8) + 'agreement'.padStart(12));
for (const seed of SEEDS) {
  let exact = 0;
  let agree = 0;
  for (const one of CORPUS) {
    const got = read(one.buffer, seed.dot(one.wpm));
    if (norm(got) === norm(one.text)) exact++;
    agree += agreement(got, one.text);
  }
  console.log(
    seed.name.padEnd(16) +
      `${exact}/${CORPUS.length}`.padStart(8) +
      `${((agree / CORPUS.length) * 100).toFixed(1)}%`.padStart(12),
  );
}
