import getDialect from '$lib/utils/dialects';
import { decodeTimings } from '$lib/morse/window-simple';
import { WindowDecoder } from '$lib/morse/window';
import { CASES } from './synth.ts';
import { SAVED_RECORDINGS } from '$lib/playground/recordings';

const D = getDialect('international');
const isCharacter = (c: string) => Object.hasOwn(D.table, c);
const TICK = 16;
function live(buffer: number[], wpm: number) {
  const d = new WindowDecoder(1200 / wpm, { isCharacter });
  const quiet = (t: number) => { for (let e = TICK; e <= t; e += TICK) { d.idle(e); if (e >= d.wordSplit) { d.flush(); return; } } };
  for (const [i, ms] of buffer.entries()) { if (i % 2 === 0) d.addSound(ms); else { quiet(ms); d.addSilence(ms); } }
  quiet(4000);
  return d.visible.filter(l => l.wordBreak).length;
}
const all = [
  ...CASES.filter(c => c.text.includes(' ')).map(c => ({ id: c.id, buffer: c.buffer, wpm: c.wpm, want: c.text })),
  ...SAVED_RECORDINGS.map(r => ({ id: `corpus/${r.id}`, buffer: r.buffer, wpm: r.wpm, want: r.expected })),
];
let simpWith = 0;
for (const one of all) {
  const out = decodeTimings(one.buffer, { isCharacter });
  const breaks = out.split(' ').filter(t => t === '/').length;
  if (breaks) simpWith++;
  const want = (one.want.trim().split(/\s+/).length - 1);
  if (breaks !== want) console.log(`${one.id}: want ${want} breaks, simple ${breaks}, live ${live(one.buffer, one.wpm)}`);
}
console.log(`simple produced a word break in ${simpWith}/${all.length}`);
