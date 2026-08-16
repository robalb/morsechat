/**
 * The whole-message decoder: measure the message, then read it.
 *
 * This is the receiver's and the server's decoder. Their message arrives
 * complete, so unlike every decoder in lib/playground/decoders.ts this one never
 * has to guess at a message it has not seen the end of, and needs nothing that
 * adapts: measure the whole buffer once, decode the whole buffer once.
 *
 * It is the playground's `global average` with the streaming taken out, and
 * taking the streaming out is the point. That one re-measures after every
 * element, which is why an `h` shows up as `eeee` for the first second of a
 * message — at the moment the four dots have been keyed they *are* the whole
 * message, and their own mean says they are four letters. Here the dashes later
 * in the message are in the measurement from the start.
 *
 * The decode is `decodeBuffer` (./decode.ts): morse-pro against a wpm, the same
 * path the sender's preview uses and the same arithmetic the backend uses
 * (`1200 / wpm`, backend/internal/morse/decode.go). The point of a server-side
 * decode is to agree with what the sender was shown, and the surest way to
 * agree is to run the same code with a better number.
 */

import { decodeBuffer } from './decode';
import type { Dialect } from '$lib/utils/dialects';

/** the range a dot estimate is allowed into, in ms: 60wpm to 2wpm */
const MIN_DOT = 20;
const MAX_DOT = 600;

/**
 * How much longer the long presses have to be than the short ones before they
 * are believed to be dashes.
 *
 * A dash is three dots, so anything close to that is separated well; the bar is
 * low because a hurried hand's dashes can come down to twice its dots, and a run
 * of presses that only differ by half again is one cloud with a line drawn
 * through it.
 */
const SEPARATION = 1.8;

/** how many times the split is re-taken. It converges in two or three on real
 * messages; the cap is only there so a pathological input cannot loop. */
const PASSES = 12;

/**
 * The centre of a group of durations.
 *
 * The geometric mean, because morse durations are multiplicative — a dash is
 * three times a dot, not three hundred milliseconds more than one — and because
 * it is far less impressed by the single 1500ms press that comes out of a key
 * the operator forgot to release.
 */
function centre(values: number[]): number {
  const logs = values.map((ms) => Math.log(Math.max(ms, 1)));
  return Math.exp(logs.reduce((a, b) => a + b, 0) / logs.length);
}

/** what a message's presses say about the hand that keyed them */
export interface Measurement {
  /** one dot, in ms */
  dot: number;
  /**
   * Whether the presses fell into two groups: whether a dash has been seen.
   *
   * A complete message either has both or is genuinely all dots, so a receiver
   * never has to ask. It matters to anything reading a message that is still
   * being keyed: until a dash has arrived there is nothing to measure the dot
   * against, and `eeee` is the only reading on offer for what will be an `h`.
   */
  separated: boolean;
  /** how many presses fell in the long group: how many dashes have been seen */
  dashes: number;
}

/**
 * One dot, in milliseconds, measured from a complete message.
 *
 * Split the presses into a short group and a long one and read both as evidence
 * about the same unit: the short group is one of it, the long one three.
 *
 * Two details separate this from splitting at the mean and stopping:
 *
 *   - **the split is iterated.** Splitting at the mean puts the boundary
 *     wherever the *mix* of dots and dashes happens to put it, and English is
 *     mostly dots, so on a message with a few dashes the mean sits well inside
 *     the dot cluster and half the dots are read as dashes. Re-splitting at the
 *     midpoint of the two centres until it stops moving — Lloyd's algorithm on
 *     two clusters — puts the boundary between the groups instead.
 *   - **the split can be refused.** A message of nothing but dots has a mean
 *     too, and half its dots fall below it, so a decoder that always splits
 *     always finds "dashes" and reports a hand twice as fast as the one that
 *     keyed it. Under `SEPARATION` there is one kind of press here, and reading
 *     them all as dots is the assumption that loses least: dashes read as dots
 *     are a visible mess, dots read as dashes swallow the letters silently.
 *
 * @returns null if the buffer holds no presses at all
 */
export function measure(buffer: number[]): Measurement | null {
  // the even entries of a key buffer are sound and the odd ones silence, which
  // is the convention the whole app records in
  const presses = buffer.filter((_, i) => i % 2 === 0);
  if (presses.length === 0) return null;

  let split = centre(presses);
  let short = presses;
  let long: number[] = [];

  for (let pass = 0; pass < PASSES; pass++) {
    const below = presses.filter((ms) => ms < split);
    const above = presses.filter((ms) => ms >= split);
    if (below.length === 0 || above.length === 0) break;

    short = below;
    long = above;
    const next = Math.sqrt(centre(below) * centre(above));
    if (Math.abs(next - split) < 1) break;
    split = next;
  }

  const separated = long.length > 0 && centre(long) >= centre(short) * SEPARATION;
  const dot = separated ? (centre(short) + centre(long) / 3) / 2 : centre(presses);

  return {
    dot: Math.min(Math.max(dot, MIN_DOT), MAX_DOT),
    separated,
    dashes: separated ? long.length : 0,
  };
}

export interface MessageOptions {
  dialect: Dialect;
  /** `show_readable`: the text, or the dots and dashes it was keyed as */
  showReadable: boolean;
  /**
   * The speed to fall back on when the buffer holds nothing to measure — the
   * sender's wpm setting, which is what travels with the message.
   */
  wpm: number;
  /**
   * Whether the message is finished. A receiver's is, by definition; the
   * playground shows this decoder mid-message too, and there the last letter
   * has not been ended by anything yet.
   */
  complete?: boolean;
}

/**
 * A complete message, decoded against its own speed.
 *
 * The whole algorithm: one measurement of everything, one decode of everything.
 */
export function decodeMessage(buffer: number[], options: MessageOptions): string {
  const { dialect, showReadable, wpm, complete = true } = options;
  const measured = measure(buffer);
  return decodeBuffer(buffer, {
    wpm: measured === null ? wpm : 1200 / measured.dot,
    dialect,
    showReadable,
    letterComplete: complete,
  });
}
