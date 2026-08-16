/**
 * What the decoder playground is made of: a recording, and a decoder.
 *
 * The playground (src/pages/playground.html) exists to answer one question that
 * cannot be answered by reading code: which decoding algorithm reads a real
 * hand the way its owner meant it, and does so *without rewriting what it has
 * already shown them*. That second half is the hard one — a decoder that
 * re-measures the message and re-decodes it from the start turns "hello" into
 * "eeee ee" the moment the operator slows down — and it is only visible when
 * several algorithms are watched side by side against the same keying.
 *
 * So the shapes here are built around replay: a recording is the raw key
 * timings and nothing else, and a decoder is fed those timings one at a time,
 * in the order and at the speed they were keyed. Feeding is the only way in.
 * An algorithm that would like to look at the whole message is free to keep its
 * own copy of what it has been fed — the fixed decoder does exactly that — but
 * it cannot be handed the future, which is the property being tested.
 */
import type { Dialect } from '$lib/utils/dialects';

/** One keyed message, kept as what the key did and nothing more. */
export interface Recording {
  /** stable across a copy-paste into recordings.ts, and used as a svelte key */
  id: string;

  /**
   * Alternating key-down and key-up durations in milliseconds, starting with a
   * key-down. This is the same array the chat sends over the websocket
   * (lib/morse/keyer.svelte.ts), which is what makes a recording made here
   * meaningful there.
   */
  buffer: number[];

  /**
   * The wpm slider setting at the time it was keyed. Restored on playback: the
   * fixed decoder reads the slider, so replaying a recording against a
   * different one measures the slider rather than the algorithm.
   */
  wpm: number;

  /**
   * What the operator meant to key, typed in by hand in the sidebar. This is
   * the ground truth the whole exercise is for, and it is empty until someone
   * fills it in — nothing computes it, because a decoder computing its own
   * exam paper is no test at all.
   */
  expected: string;

  /** when it was keyed, ISO 8601 */
  created: string;
}

/** what a decoder needs to know that is not in the timings */
export interface DecodeContext {
  /** the wpm slider. Algorithms that measure the hand themselves ignore it. */
  wpm: number;
  dialect: Dialect;
  /** `show_readable`: letters, or the dots and dashes they were keyed as */
  showReadable: boolean;
}

/**
 * One decoding algorithm, mid-message.
 *
 * The three inputs are the three things that can happen at a straight key: a
 * press ended, a silence ended, and neither has happened for a while. The last
 * one matters more than it looks — the silence that finishes the final letter
 * of a message has no measured length until the *next* press arrives, which may
 * be never, so a decoder that only ever saw completed silences would leave the
 * last letter unread on screen forever.
 *
 * `render` is deliberately separate from all three. It is called on every
 * change and also whenever the dialect or `show_readable` moves, so it must be
 * pure and cheap and must not adapt anything: adapting in a render is how an
 * algorithm ends up learning from how often the user changed a dropdown.
 */
export interface Decoder {
  /** a press ended, having lasted `ms` */
  addSound(ms: number): void;

  /** a silence ended, having lasted `ms`: the next press just arrived */
  addSilence(ms: number): void;

  /** the key has now been up for `ms` and is still up */
  idle(ms: number): void;

  /**
   * Forget everything: a new message is starting.
   *
   * The context is passed because an adaptive algorithm has to start from
   * *some* assumption about the hand, and the slider is the only one available
   * before a single element has been keyed.
   */
  reset(ctx: DecodeContext): void;

  /** the line the preview box shows */
  render(ctx: DecodeContext): string;

  /**
   * The speed this algorithm believes the operator is keying at, or null if it
   * does not have an opinion because it was told. Shown in the box, where
   * watching it move is most of what explains a misread.
   */
  measuredWpm(): number | null;
}

/** a decoder, and what to call it in the column of preview boxes */
export interface Algorithm {
  id: string;
  /** the label above its box */
  name: string;
  /** one line under the label: what it does, and what it is expected to do badly */
  description: string;
  create(): Decoder;
}
