/**
 * What window.ts is asked, and what its answer is recorded as.
 *
 * The counterpart of test/average-cases.ts, for a decoder that is a stream
 * rather than a function: the same generated hands and the same corpus, typed
 * in element by element with the idle ticks in between, exactly as `WindowSlot`
 * in lib/playground/decoders.ts drives it.
 *
 * The record cannot hold every frame — a long message is hundreds of them, most
 * differing by one dot — so it holds three things that between them pin the
 * behaviour: every distinct state of the committed text (which is where a
 * rewrite would show), the final state in full, and a hash of every frame the
 * operator would have seen. The hash catches a change in the middle of a
 * message that the freeze list happens to end up agreeing with; `frames` prints
 * them when it does.
 */
import { WindowDecoder, type Letter } from '$lib/morse/window';
import getDialect from '$lib/utils/dialects';
import { SAVED_RECORDINGS } from '$lib/playground/recordings';

import { CASES, type Case } from './synth.ts';

const DIALECT = getDialect('international');
const isCharacter = (code: string) => Object.hasOwn(DIALECT.table, code);

/** the engine's animation frame, and how long the ticks run after the last
 * release: test/harness.ts uses the same two numbers */
const TICK = 16;
const IDLE_MAX = 4000;

export const GOLDEN_PATH = new URL('./golden/window.json', import.meta.url);

export const ALL_CASES: Case[] = [
  ...CASES,
  ...SAVED_RECORDINGS.map((r) => ({
    id: `corpus/${r.id}`,
    text: r.expected,
    buffer: r.buffer,
    wpm: r.wpm,
  })),
];

/** letters as one line, which is what a rewrite would change */
function line(letters: Letter[]): string {
  return letters.map((l) => (l.wordBreak ? `/ ${l.code}` : l.code)).join(' ');
}

/** FNV-1a, so that "every frame was the same" is one number */
function hash(parts: string[]): string {
  let h = 0x811c9dc5;
  for (const part of parts) {
    for (let i = 0; i < part.length; i++) h = Math.imul(h ^ part.charCodeAt(i), 0x01000193) >>> 0;
    h = Math.imul(h ^ 0x0a, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** one recording, typed into one decoder, with `onFrame` after every event */
function replay(one: Case, onFrame: (d: WindowDecoder) => void): WindowDecoder {
  const decoder = new WindowDecoder(1200 / Math.min(Math.max(one.wpm, 1), 200), { isCharacter });

  const idle = (total: number) => {
    for (let elapsed = TICK; elapsed <= total; elapsed += TICK) {
      decoder.idle(elapsed);
      // past a word gap of silence nothing is going to push the window along,
      // which is when WindowSlot flushes it
      if (elapsed >= decoder.wordSplit) decoder.flush();
      onFrame(decoder);
    }
  };

  for (const [i, ms] of one.buffer.entries()) {
    if (i % 2 === 0) {
      decoder.addSound(ms);
      onFrame(decoder);
    } else {
      idle(ms);
      decoder.addSilence(ms);
      onFrame(decoder);
    }
  }
  idle(IDLE_MAX);
  return decoder;
}

/** every frame of one replay, for looking at when the hash disagrees */
export function frames(one: Case): string[] {
  const out: string[] = [];
  replay(one, (d) => out.push(`${line(d.visible)} | ${d.preview}`));
  return out;
}

export interface Reading {
  id: string;
  /** every distinct state of the committed text, in order */
  froze: string[];
  /** what was on screen at the end: the frozen letters, and the window */
  visible: string;
  preview: string;
  /** the dot the search settled on, in ms, and every one it believed in */
  dot: number;
  dots: number[];
  frames: number;
  frameHash: string;
}

export function read(one: Case): Reading {
  const froze: string[] = [];
  const dots: number[] = [];
  const seen: string[] = [];

  const decoder = replay(one, (d) => {
    seen.push(`${line(d.visible)} | ${d.preview}`);
    const done = line(d.letters);
    if (froze[froze.length - 1] !== done) froze.push(done);
    const dot = Math.round(d.dot * 10) / 10;
    if (dots[dots.length - 1] !== dot) dots.push(dot);
  });

  return {
    id: one.id,
    froze,
    visible: line(decoder.visible),
    preview: decoder.preview,
    dot: Math.round(decoder.dot * 10) / 10,
    dots,
    frames: seen.length,
    frameHash: hash(seen),
  };
}

export function snapshot(): Reading[] {
  return ALL_CASES.map(read);
}
