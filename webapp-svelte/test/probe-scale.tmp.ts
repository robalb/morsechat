/**
 * Scores lib/morse/scale.ts over the same 110 generated hands and 7 corpus
 * recordings test/probe-variants.tmp.ts uses, so the numbers are comparable to
 * the table in its header (window.ts as-is: 48/110 4/7; window-static: 86/110 6/7).
 *
 *   node --experimental-strip-types --import ./test/loader.mjs test/probe-scale.tmp.ts
 */
import getDialect from '$lib/utils/dialects';
import { ScaleDecoder, decodeTimings } from '$lib/morse/scale';
import { decodeTimings as decodeWindow } from '$lib/morse/window-static';
import { WindowDecoder } from '$lib/morse/window';
import { SAVED_RECORDINGS } from '$lib/playground/recordings';

import { synth, hand, type Hand } from './synth.ts';

const DIALECT = getDialect('international');
const isCharacter = (code: string) => Object.hasOwn(DIALECT.table, code);
const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);
const TICK = 16;

const toText = (line: string) =>
  line
    .split(' ')
    .filter((c) => c && c !== '/')
    .map((c) => DIALECT.table[c] ?? `[${c}]`)
    .join('');

/** replays a buffer through a live decoder the way the playground engine does */
function live(buffer: number[], wpm: number, make: () => ScaleDecoder | WindowDecoder): string {
  const d = make();
  d.reset(1200 / clamp(wpm, 1, 200));
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
  idle(4000);
  return toText(d.visible.map((l) => l.code).join(' '));
}

const scale = (buffer: number[], wpm: number) =>
  live(buffer, wpm, () => new ScaleDecoder(100, { isCharacter }));
const window = (buffer: number[], wpm: number) =>
  live(buffer, wpm, () => new WindowDecoder(100, { isCharacter }));

const MESSAGES = ['m','mnat','to','ton','oat','omen','tom','meno','no more','go to town','e','et','is',
  'hello world','sos','the quick','eat','seen','test','a test','cq de morsechat','this is a test'];
const HANDS: Record<string, Hand> = {
  textbook: hand(), sloppy: hand({ jitter: 0.3 }),
  heavy_dash: hand({ wpm: 20, jitter: 0.2, dash: 7, letterGap: 5, wordGap: 12 }),
  slow: hand({ wpm: 5, jitter: 0.12 }), fast: hand({ wpm: 35, jitter: 0.12 }),
};

const KEYS = ['scale', 'scale_static', 'window', 'window_static'] as const;
const score: Record<string, number> = Object.fromEntries(KEYS.map((k) => [k, 0]));
let total = 0;
const bad: string[] = [];

for (const msg of MESSAGES) {
  for (const [name, h] of Object.entries(HANDS)) {
    const seed = [...`${msg}/${name}`].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
    const buffer = synth(msg, h, seed);
    const want = msg.replace(/\s+/g, '');
    total++;
    const got: Record<string, string> = {
      scale: scale(buffer, h.wpm),
      scale_static: toText(decodeTimings(buffer, { isCharacter })),
      window: window(buffer, h.wpm),
      window_static: toText(decodeWindow(buffer, { isCharacter })),
    };
    for (const k of KEYS) if (got[k] === want) score[k]++;
    if (got.scale !== want || got.scale_static !== want) {
      bad.push(
        `${`${msg}/${name}`.padEnd(22)} want=${want.padEnd(12)} ` +
          `live=${got.scale.padEnd(12)} static=${got.scale_static.padEnd(12)} (window=${got.window})`
      );
    }
  }
}
console.log(bad.join('\n'));
console.log(`\nsynthetic, out of ${total}:`, score);

const CORPUS = SAVED_RECORDINGS.filter((r) => r.expected.trim());
const cs: Record<string, number> = Object.fromEntries(KEYS.map((k) => [k, 0]));
const rows: string[] = [];
for (const r of CORPUS) {
  const want = r.expected.replace(/\s+/g, '');
  const got: Record<string, string> = {
    scale: scale(r.buffer, r.wpm),
    scale_static: toText(decodeTimings(r.buffer, { isCharacter })),
    window: window(r.buffer, r.wpm),
    window_static: toText(decodeWindow(r.buffer, { isCharacter })),
  };
  for (const k of KEYS) if (got[k] === want) cs[k]++;
  rows.push(
    `${want.padEnd(24)} live=${got.scale.padEnd(24)} static=${got.scale_static.padEnd(24)} ` +
      `window=${got.window.padEnd(24)} window_static=${got.window_static}`
  );
}
console.log('\ncorpus:');
console.log(rows.join('\n'));
console.log(`corpus, out of ${CORPUS.length}:`, cs);

// how long one fit takes, on the longest buffer in the corpus
const longest = SAVED_RECORDINGS.reduce((a, b) => (a.buffer.length > b.buffer.length ? a : b));
const started = process.hrtime.bigint();
decodeTimings(longest.buffer, { isCharacter });
console.log(
  `\nstatic fit over ${longest.buffer.length} events: ` +
    `${Number(process.hrtime.bigint() - started) / 1e6}ms`
);
