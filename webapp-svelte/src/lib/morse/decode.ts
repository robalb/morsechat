/**
 * The message preview: a key buffer, read back as what it says.
 *
 * This replaces `bufferedMorseToString` of webapp/src/components/preview/
 * Preview.jsx, which walked the buffer with two thresholds and a running
 * string. The walk is morse-pro's decoder now (lib/morse-pro/), and what is
 * left here is the two things that are ours: the dialect, and how a half-typed
 * letter is shown.
 *
 * Every call decodes the whole buffer from scratch. That is deliberate: the
 * decode depends on the wpm and the dialect, both of which the user can change
 * in the middle of a message, and a decoder kept alive across changes would
 * hold letters decoded at the old speed. A buffer is at most a few hundred
 * numbers — the backend truncates a message at 60 seconds — so there is nothing
 * to gain by being incremental.
 */
import MorseDecoder from '$lib/morse-pro/morse-pro-decoder';
import type { Dialect } from '$lib/utils/dialects';

import { morseTimes } from './timings';

/** one decoded character, and whether the silence before it ended a word */
export interface Letter {
  /** its dots and dashes, e.g. `-...` */
  code: string;
  wordBreak: boolean;
}

/** what a dash is drawn with: an endash (U+2013), as in the react version */
export const DASH_CHAR = '–';

/** the two spaces the react version put between words */
const WORD_SPACE = '  ';

export interface DecodeOptions {
  /** the speed the message is decoded against, the user's wpm setting */
  wpm: number;
  /** which table a code is looked up in */
  dialect: Dialect;
  /** `show_readable`: text, or the dots and dashes it was keyed as */
  showReadable: boolean;
  /**
   * Whether enough silence has passed since the last release for the letter
   * being keyed to be considered finished. The buffer cannot say — the silence
   * at the end of it has not been recorded yet, because it ends when the next
   * key press arrives — so the caller times it and passes the answer.
   */
  letterComplete: boolean;
}

/**
 * The lookup the decoder hands each completed character to.
 *
 * A chunk is one character with the separator that preceded it, so it can start
 * with a ' ' (a new letter) or a '/' (a new word). An unknown code is shown as
 * itself between spaces, as the react `translateToReadable` did: keying
 * something the dialect has no letter for should look like a mistake, not
 * vanish.
 *
 * Only a leading separator counts. A chunk can also end with one — the decoder
 * hands back the silence it stopped at, so a word gap arrives twice, once
 * closing the letter before it and once opening the letter after — and taking
 * both would break the word in the wrong place and then break it again.
 */
export function makeMorse2Text(dialect: Dialect): (morse: string) => string {
  return (chunk: string) => {
    const word = chunk.trimStart().startsWith('/');
    const code = chunk.replace(/[ /]/g, '');
    if (!code) return '';
    return (word ? WORD_SPACE : '') + lookup(dialect, code);
  };
}

/**
 * One code as the dialect reads it.
 *
 * An unknown code is shown as itself between spaces, as the react
 * `translateToReadable` did: keying something the dialect has no letter for
 * should look like a mistake, not vanish.
 *
 * Also used by lib/sound/receiver.ts, which reads a message one letter at a
 * time and must agree with the rest of this file on what a code says.
 */
export function lookup(dialect: Dialect, code: string): string {
  return Object.hasOwn(dialect.table, code) ? dialect.table[code] : ` ${code} `;
}

export interface RenderOptions {
  dialect: Dialect;
  /** `show_readable`: text, or the dots and dashes it was keyed as */
  showReadable: boolean;
}

/**
 * A live decoder's output, as a line of text.
 *
 * The counterpart of `decodeBuffer` for the decoders that measure as they read
 * (lib/morse/scale.ts, lib/morse/window.ts): there the whole buffer is
 * classified on every call at one fixed speed, here the codes were classified
 * as they arrived and only have to be looked up. Which is why the dialect and
 * `show_readable` can change mid-message without disturbing a letter.
 *
 * @param letters - the characters already decided
 * @param pending - the dots and dashes of the character still being keyed
 */
export function renderLetters(letters: Letter[], pending: string, options: RenderOptions): string {
  const { dialect, showReadable } = options;

  let text = '';
  for (const { code, wordBreak } of letters) {
    // Readable letters run together and morse does not, which is the spacing
    // `decodeBuffer` produces: there, one is `morse2text` returning the bare
    // letter and the other is the decoder's own ' ' between characters.
    if (wordBreak) text += WORD_SPACE;
    else if (text && !showReadable) text += ' ';
    text += showReadable ? lookup(dialect, code) : code;
  }
  if (pending) {
    text += text ? ' ' : '';
    text += pending;
  }
  return text.replaceAll('-', DASH_CHAR);
}

/**
 * Decodes a key buffer into the line under the chat.
 *
 * @param buffer - alternating key-down and key-up durations in ms, starting
 * with a key-down. This is what is keyed, what is sent, and what the receiver
 * plays back.
 */
export function decodeBuffer(buffer: number[], options: DecodeOptions): string {
  const { wpm, dialect, showReadable, letterComplete } = options;

  const decoder = new MorseDecoder({
    wpm,
    morse2text: makeMorse2Text(dialect),
  });

  // the even entries are sound, the odd ones silence, which is the sign the
  // decoder reads them by
  for (let i = 0; i < buffer.length; i++) {
    decoder.addTiming(i % 2 === 0 ? buffer[i] : -buffer[i]);
  }

  // The letter at the end is only decoded once its silence has been waited out.
  // Feeding that silence rather than forcing a flush keeps the decoder's own
  // rule about what ends a character, and is the equivalent of the react
  // version's `canTranslateLast`.
  if (letterComplete) {
    decoder.addTiming(-morseTimes(wpm).letterGap);
  }

  // The dots and dashes are shown as they were keyed, with the word breaks
  // collapsed for the same reason `makeMorse2Text` ignores a trailing one: a
  // gap long enough to end a word is reported at both ends of it.
  const done = showReadable
    ? decoder.message
    : decoder.morse.replace(/\/+/g, WORD_SPACE);

  // What is left is the letter being keyed: its dots and dashes are shown as
  // they arrive, and are replaced by the letter itself when it ends. The
  // leading separator is dropped — it is the gap that closed the letter before,
  // and it has already been rendered as part of it.
  const pending = decoder.pendingMorse.replace(/^[ /]+/, '');

  const text = pending && done ? `${done} ${pending}` : done + pending;
  return text.replaceAll('-', DASH_CHAR);
}
