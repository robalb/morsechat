/**
 * The whole-message decoder: measure the message, then read it.
 *
 * This is the receiver's and the server's decoder, and it exists because their
 * problem is not the sender's problem. The preview under the key has to say
 * something now, about a message that is still being keyed, so every decoder in
 * lib/playground/decoders.ts is built around not yet knowing how the message
 * ends — that is where the flicker, the sliding window and the adaptive
 * estimates all come from. A receiver has none of that difficulty: the message
 * arrives complete, as one buffer of durations, and is decoded once. Nothing
 * about it is live, so nothing about it needs to adapt.
 *
 * So this does the obvious thing, in the obvious order:
 *
 *   1. measure the whole message — one dot, in milliseconds
 *   2. decode the whole message against that measurement, in one call
 *
 * It is the `global average` algorithm of the playground with the streaming
 * taken out, and taking the streaming out is the entire point. That one
 * re-measures after every element and re-decodes what it has so far, which is
 * why an `h` shows up as `eeee` for the first second of a message: at the
 * moment the four dots have been keyed, the four dots *are* the whole message,
 * and their own mean says they are four letters. There is no such moment here.
 * The dashes later in the message are in the measurement from the start,
 * because the measurement is taken once, from all of it.
 *
 * The one substantive change from that algorithm is in the measurement, and it
 * is small: instead of splitting the presses at their mean once, the split is
 * iterated to a fixed point, and it is refused outright when the two sides do
 * not look like two different things. See `measure`.
 *
 * `measure` also reports *whether* it found two groups, which a receiver has no
 * use for and anything showing a message as it is keyed does: until a dash has
 * arrived there is nothing to measure a dot against, every press is being read
 * as a dot, and the only reading on offer is `eeee` for what is about to be an
 * `h`. The playground box waits for that before it shows letters at all — see
 * `WholeMessageDecoder` in lib/playground/decoders.ts.
 *
 * The decode itself is `decodeBuffer` (./decode.ts), which is morse-pro's
 * decoder against a wpm — the same path the sender's preview uses and the same
 * arithmetic the backend uses (`1200 / wpm`, backend/internal/morse/decode.go).
 * That is deliberate: the point of a server-side decode is to agree with what
 * the sender was shown, and the surest way to agree is to run the same code
 * with a better number.
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
 * set low because a hurried hand's dashes can come down to twice its dots, and
 * a run of presses that only differ by half again is one cloud with a line
 * drawn through it.
 */
const SEPARATION = 1.8;

/** how many times the split is re-taken. It converges in two or three on real
 * messages; the cap is only there so a pathological input cannot loop. */
const PASSES = 12;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * The centre of a group of durations.
 *
 * The geometric mean, not the arithmetic one, because morse durations are
 * multiplicative — a dash is three times a dot, not three hundred milliseconds
 * more than one — and because it is far less impressed by the single 1500ms
 * press that comes out of a key the operator forgot to release.
 */
function centre(values: number[]): number {
  const logs = values.map((ms) => Math.log(Math.max(ms, 1)));
  return Math.exp(logs.reduce((a, b) => a + b, 0) / logs.length);
}

/** the presses. The even entries of a key buffer are sound and the odd ones
 * silence, which is the convention the whole app records in. */
function sounds(buffer: number[]): number[] {
  return buffer.filter((_, i) => i % 2 === 0);
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
   * against, every press is being read as a dot, and the reading on offer is
   * `eeee` for what will turn out to be an `h`.
   */
  separated: boolean;
  /** how many presses fell in the long group: how many dashes have been seen */
  dashes: number;
}

/**
 * One dot, in milliseconds, measured from a complete message.
 *
 * Split the presses into a short group and a long one, take the centre of each,
 * and read both as evidence about the same unit — the short group is one unit
 * and the long one is three.
 *
 * Two details are what separate this from splitting at the mean and stopping:
 *
 *   - **the split is iterated.** Splitting at the mean puts the boundary
 *     wherever the *mix* of dots and dashes happens to put it, and English is
 *     mostly dots, so on a message with a few dashes the mean sits well inside
 *     the dot cluster and half the dots are read as dashes. Re-splitting at the
 *     midpoint of the two centres, and again until it stops moving, puts the
 *     boundary between the groups instead of between however many of each there
 *     happened to be. This is Lloyd's algorithm on two clusters, and on a few
 *     dozen presses it converges in about three passes.
 *   - **the split can be refused.** A message of nothing but dots has a mean
 *     too, and half its dots fall below it, so a decoder that always splits
 *     always finds "dashes" — and reports a hand twice as fast as the one that
 *     keyed it. If the two centres are not `SEPARATION` apart, there is one
 *     kind of press here, and reading them all as dots is the assumption that
 *     loses least: a run of dashes read as dots is a visible mess, dots read as
 *     dashes swallow the letters silently.
 *
 * @returns the dot in ms, or null if the buffer holds no presses at all
 */
export function measure(buffer: number[]): Measurement | null {
  const all = sounds(buffer);
  if (all.length === 0) return null;

  let split = centre(all);
  let short = all;
  let long: number[] = [];

  for (let pass = 0; pass < PASSES; pass++) {
    const below = all.filter((ms) => ms < split);
    const above = all.filter((ms) => ms >= split);
    if (below.length === 0 || above.length === 0) break;

    const next = Math.sqrt(centre(below) * centre(above));
    short = below;
    long = above;
    if (Math.abs(next - split) < 1) break;
    split = next;
  }

  // one cloud, not two: every press is the same kind of thing
  if (long.length === 0 || centre(long) < centre(short) * SEPARATION) {
    return { dot: clamp(centre(all), MIN_DOT, MAX_DOT), separated: false, dashes: 0 };
  }

  // both groups say something about the same unit: the short ones are one of
  // it, the long ones three
  const dot = (centre(short) + centre(long) / 3) / 2;
  return { dot: clamp(dot, MIN_DOT, MAX_DOT), separated: true, dashes: long.length };
}

/** the dot alone, for callers that have a whole message and no doubts */
export function estimateDot(buffer: number[]): number | null {
  return measure(buffer)?.dot ?? null;
}

/** the speed a complete message was keyed at, in words per minute */
export function estimateWpm(buffer: number[], fallback: number): number {
  const dot = estimateDot(buffer);
  return dot === null ? fallback : 1200 / dot;
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
  return decodeBuffer(buffer, {
    wpm: estimateWpm(buffer, wpm),
    dialect,
    showReadable,
    letterComplete: complete,
  });
}
