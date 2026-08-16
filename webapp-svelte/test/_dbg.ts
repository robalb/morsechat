import getDialect from '$lib/utils/dialects';
import { WindowDecoder } from '$lib/morse/window';
import { CASES } from './synth.ts';
const D = getDialect('international');
const one = CASES.find(c => c.id === 'long/textbook')!;
const d = new WindowDecoder(1200 / one.wpm, { isCharacter: (c) => Object.hasOwn(D.table, c) });
const TICK = 16;
const quiet = (t: number) => { for (let e = TICK; e <= t; e += TICK) { d.idle(e); if (e >= d.wordSplit) { d.flush(); return; } } };
for (const [i, ms] of one.buffer.slice(0, 40).entries()) { if (i % 2 === 0) d.addSound(ms); else { quiet(ms); d.addSilence(ms); } }
