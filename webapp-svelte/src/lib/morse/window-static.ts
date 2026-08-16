/**
 * The window decoder, for a message that has already been keyed.
 *
 * ./window.ts reads a hand while it is keying: it has to show something after
 * every element, may never contradict a letter it has already shown, and cannot
 * see the elements that have not been keyed yet. Almost everything in that file
 * is one of those three problems. This is the same search with all three gone —
 * the message arrives complete, nothing is on screen to be contradicted, and
 * there is no "yet" — which leaves a call and a renderer.
 *
 * The search itself is ./window-core.ts, shared with window.ts. What is here is
 * this side's delivery of it, and what fell away with the streaming:
 *
 *   - **the window.** The frontier, the frozen letters, `KEEP_EVENTS`,
 *     `MAX_EVENTS`, `HORIZON`, `FLICKER_LETTERS`, `#settled` — all of it exists
 *     to decide which letters are still allowed to change. Here every letter is
 *     decided once, from the whole message, so the window is the message.
 *   - **the idle tick and the pending character.** A live decoder does not know
 *     whether the last character is finished, because the silence after it has
 *     no length until the next press. Here there is no next press: the last
 *     character is finished by definition.
 *   - **the running dot estimate**, and with it `PRIOR_COST`, `ALPHA`,
 *     `MAX_STEP` and the dot clamps. The prior is what stops a window of a dozen
 *     elements re-inventing the operator's speed on every element; a whole
 *     message has enough durations in it to be read on its own evidence, and
 *     there is no previous window for it to be pulled towards.
 *
 * One part of the scoring is not the same either, and it is the one thing a
 * finished message knows that a window cannot: **word gaps are measured here.**
 * In window.ts they join no cluster, because mid-message a long silence is an
 * operator who stopped to think and a decoder that charged them for it would be
 * scoring their attention. That exemption leaves nothing on the other side of
 * `WORD_COST`, and the reading that never breaks a word wins every time — which
 * is why window.ts effectively never sets a finite word threshold, and why the
 * spaces in its preview are not word breaks at all but empty codes rendered by
 * `lookup` as two spaces. Here the word gaps of a finished message are a band
 * like any other, so the reading that resolves three tight bands of silence can
 * out-score the one that resolves two, and a space is a space.
 *
 * The one thing this loses against the live decoder is drift. window.ts
 * re-searches every window, so a hand that speeds up across a message is read at
 * whatever speed it is going at; here one set of thresholds is fitted to the
 * whole thing, and a hand whose dots end up longer than its early dashes cannot
 * be read by any single set. That is the trade for having no state at all.
 */

import { read, search, type KeyEvent, type Segment, type WindowOptions } from './window-core';

/** the options are the core's: whether a code is a character, and nothing else */
export type StaticWindowOptions = WindowOptions;

/**
 * What a word break costs: what stops the search cutting a word out of every
 * letter, since a threshold that splits any cluster in two makes both halves
 * tighter than the whole.
 *
 * An eighth of window.ts's 1.2, and the difference is the reason this file
 * scores word gaps at all (`measureWordGaps`, below). There the charge is the
 * *only* thing
 * standing against a break, so it has to be heavy; here the scatter of the word
 * cluster does that work, and 1.2 turns out to be more than a word gap is worth:
 * a word gap sitting among letter gaps costs the letter cluster about half a
 * point of scatter, so at 1.2 no break in a real message ever pays for itself
 * and every message comes out as one long word. Over the corpus and the
 * generated hands the whole range 0.15–0.2 puts the spaces in the right places;
 * under 0.1 the search starts inventing them.
 */
const WORD_COST = 0.15;

/** the token a word break is written as, between the codes on either side of it */
const WORD_BREAK = '/';

/**
 * The message as the core reads events: the even entries are presses and the odd
 * ones the silences after them, which is the convention the whole app records in.
 */
function toEvents(buffer: number[]): KeyEvent[] {
  return buffer.map((ms, i) => ({ ms, sound: i % 2 === 0 }));
}

/**
 * The characters a reading produced, as the line of codes this module returns.
 *
 * The empty codes are dropped. A reading closes a character at every gap it
 * calls a letter gap, and where two of those fall together — or where the last
 * one is the silence at the end of the message — what it closed had no elements
 * in it. The live decoder draws those (they are the spacing in its preview);
 * here they are nothing, and so is a break that ends up with no word after it.
 */
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
 * (`lib/morse/decode.ts`), not the decoder's, and the caller may want to show
 * either.
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
      // the one scoring difference between the two decoders, and the reason
      // this file's WORD_COST is an eighth of the live one's
      measureWordGaps: true,
    })
  );
  return best === null ? '' : render(best.letters);
}
