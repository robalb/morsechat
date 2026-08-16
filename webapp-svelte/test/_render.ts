import getDialect from '$lib/utils/dialects';
import { renderLetters } from '$lib/morse/decode';
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
  return renderLetters(d.visible, d.preview, { dialect: D, showReadable: true });
}
function simple(buffer: number[]) {
  const letters = [];
  let wordBreak = false;
  for (const t of decodeTimings(buffer, { isCharacter }).split(' ')) {
    if (!t) continue;
    if (t === '/') { wordBreak = true; continue; }
    letters.push({ code: t, wordBreak });
    wordBreak = false;
  }
  return renderLetters(letters, '', { dialect: D, showReadable: true });
}
const pick = [...CASES.filter(c => ['long/textbook','numbers/textbook','mixed/textbook','hello/textbook'].includes(c.id)),
  ...SAVED_RECORDINGS.map(r => ({ id: `corpus/${r.id}`, buffer: r.buffer, wpm: r.wpm, text: r.expected }))];
for (const one of pick) {
  console.log(`${one.id}\n  want:   ${one.text}\n  window: ${live(one.buffer, one.wpm)}\n  simple: ${simple(one.buffer)}`);
}
