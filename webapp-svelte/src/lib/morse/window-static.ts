/**
 * The static decoder: a message that is already over, read once.
 *
 * `decodeTimings` takes a complete key buffer and returns the codes in it. No
 * window, no frontier, no running speed estimate — one set of thresholds is
 * fitted to the whole message, so every character is decided once, with the rest
 * of the message as evidence. It is the reference for decoding server-side,
 * where the buffer always arrives complete, and the playground runs it beside
 * the live decoder to show what reading in real time costs.
 *
 * The algorithm is ./window-core.ts. The one thing done differently here is that
 * word gaps are measured as a cluster (`measureWordGaps`), which is only
 * possible on a finished message, and which is why `WORD_COST` below is an
 * eighth of the live decoder's.
 */

import { read, search, type KeyEvent, type Segment, type WindowOptions } from './window-core';

export type StaticWindowOptions = WindowOptions;

/**
 * What a word break costs: what stops the search cutting a word out of every
 * letter, since a threshold that splits any cluster in two makes both halves
 * tighter than the whole.
 *
 * Here the scatter of the word cluster does most of that work, and window.ts's
 * 1.2 turns out to be more than a word gap is worth: a word gap sitting among
 * letter gaps costs the letter cluster about half a point of scatter, so at 1.2
 * no break in a real message ever pays for itself and every message comes out as
 * one long word. Over the corpus and the generated hands the whole range
 * 0.15–0.2 puts the spaces in the right places; under 0.1 the search starts
 * inventing them.
 */
const WORD_COST = 0.15;

/** the token a word break is written as, between the codes on either side of it */
const WORD_BREAK = '/';

/** the even entries are presses and the odd ones the silences after them, which
 * is the convention the whole app records in */
function toEvents(buffer: number[]): KeyEvent[] {
  return buffer.map((ms, i) => ({ ms, sound: i % 2 === 0 }));
}

/** the characters of a reading, as the line of codes this module returns. The
 * empty codes are dropped, and so is a break with no word after it. */
function render(letters: Segment[]): string {
  const out: string[] = [];
  for (const { code, wordBreak } of letters) {
    if (!code) continue;
    if (wordBreak && out.length > 0) out.push(WORD_BREAK);
    out.push(code);
  }
  return out.join(' ');
}

/**
 * A finished message, read as dots, dashes and the breaks between them.
 *
 * @param buffer - alternating key-down and key-up durations in ms, starting with
 * a key-down: the array the chat sends over the websocket and the playground
 * records, complete.
 * @returns the codes, separated by ' ', with a `/` between words — e.g.
 * `".... . .-.. .-.. --- / .-- --- .-. .-.. -.."`. Codes rather than text
 * because which letters those are is the dialect's business
 * (`lib/morse/decode.ts`), not the decoder's.
 */
export function decodeTimings(buffer: number[], options: StaticWindowOptions): string {
  if (buffer.length === 0) return '';

  const events = toEvents(buffer);
  const sounds = events.filter((e) => e.sound).map((e) => e.ms);
  const gaps = events.filter((e) => !e.sound).map((e) => e.ms);

  const best = search(sounds, gaps, (thresholds) =>
    read(events, thresholds, {
      isCharacter: options.isCharacter,
      wordCost: WORD_COST,
      measureWordGaps: true,
    })
  );
  return best === null ? '' : render(best.letters);
}
