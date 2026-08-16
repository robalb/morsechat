#!/usr/bin/env -S node --experimental-strip-types
/**
 * The adaptive decoder, keyed by a hand that does not keep time.
 *
 * `keyer-test.js` drives the real app in a real browser, which is the truth but
 * takes a minute a case and can only try what a person could sit through. This
 * imports lib/morse/adaptive.ts directly and keys hundreds of messages into it
 * in a second, at speeds that drift, with a slider set to the wrong number, so
 * that a change to a constant in there can be judged before it is believed.
 *
 * It feeds the decoder exactly as keyer.svelte.ts does, letter timer included,
 * which is what makes the results mean anything: the timer's threshold is one
 * of the things being tested.
 *
 *   node --experimental-strip-types adaptive-sim.ts
 *   node --experimental-strip-types adaptive-sim.ts --trace "hello world" --wpm 20 --to 7 --slider 20
 *
 * What to look at, in order:
 *
 *   unstable   Must be 0. It counts messages where something already on screen
 *              changed afterwards — the "hello" that turned into "eeee" — which
 *              is the failure the whole causal design exists to prevent, and no
 *              accuracy number is worth trading for it.
 *   tail       Whether the message reads correctly once the decoder has locked
 *              on, ignoring the first two characters. Those two are decoded
 *              against the slider and cannot be right when the slider is wrong,
 *              so counting them measures the prior, not the algorithm.
 *   chars      Positional agreement over the whole message, first characters
 *              included. It collapses when a letter is dropped early, so read it
 *              as a rough second opinion and not as a score.
 */
import { AdaptiveDecoder, basesFromWpm, wpmOf } from '../webapp-svelte/src/lib/morse/adaptive.ts';
import { TEXT2MORSE } from './lib/morsekeyer.js';

const FROM_MORSE: Record<string, string> = Object.fromEntries(
  Object.entries(TEXT2MORSE).map(([letter, code]) => [code as string, letter])
);

const args = process.argv.slice(2);
const flag = (name: string, fallback = '') => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : (args[i + 1] ?? '');
};

type Event = { sound: number } | { silence: number };

/**
 * What a hand actually does, in units of its own dit.
 *
 * A metronome keys 1:3 and 1:3:7 and the decoder reads it perfectly, which is
 * why an early version of this file proved an algorithm that then fell over in
 * a browser. A person on a straight key does none of that: the gap between two
 * elements of a letter runs long because the hand has to come back up, the gap
 * between letters runs longer still because that is where the thinking happens,
 * and the dash is whatever felt long enough. These are the knobs for that, and
 * the defaults are textbook so that a condition only differs from it where it
 * says it does.
 */
interface Hand {
  /** a dash, in dits */
  dash: number;
  /** the gap between two elements of one letter, in dits */
  gap: number;
  /** the gap between two letters, in dits */
  letterGap: number;
  /** the gap between two words, in dits */
  wordGap: number;
  /** how much every duration wobbles, either side */
  jitter: number;
}

const TEXTBOOK: Hand = { dash: 3, gap: 1, letterGap: 3, wordGap: 7, jitter: 0.1 };

/**
 * Keys a phrase, at a speed that walks from `wpm0` to `wpm1` across it and
 * with the proportions and wobble of `hand`.
 *
 * The drift is the point: a novice does not key at one speed, they wind down
 * over a sentence or speed up as they find the rhythm, and a decoder that only
 * ever sees a constant speed is not being tested at all.
 */
function key(text: string, wpm0: number, wpm1: number, hand: Hand, seed = 1): Event[] {
  let rnd = seed;
  const rand = () => {
    rnd = (rnd * 1103515245 + 12345) % 2147483648;
    return rnd / 2147483648;
  };
  const fuzz = (ms: number) => Math.round(ms * (1 + (rand() * 2 - 1) * hand.jitter));

  const events: Event[] = [];
  const total = text.replace(/ /g, '').length;
  let done = 0;
  const dit = () => 1200 / (wpm0 + (wpm1 - wpm0) * (total <= 1 ? 1 : done / (total - 1)));

  text.split(' ').forEach((word, w) => {
    if (w > 0) events.push({ silence: fuzz(dit() * hand.wordGap) });
    [...word].forEach((char, c) => {
      if (c > 0) events.push({ silence: fuzz(dit() * hand.letterGap) });
      [...(TEXT2MORSE[char] ?? '')].forEach((element, e) => {
        if (e > 0) events.push({ silence: fuzz(dit() * hand.gap) });
        events.push({ sound: fuzz(element === '.' ? dit() : dit() * hand.dash) });
      });
      done++;
    });
  });
  return events;
}

/** what the preview would read, at one moment */
function render(decoder: AdaptiveDecoder): string {
  const done = decoder.letters.map((l) => FROM_MORSE[l.code] ?? `[${l.code}]`).join('');
  return decoder.pending ? `${done} ${decoder.pending}` : done;
}

/**
 * Plays a stream into a decoder the way the keyer does, and keeps every frame
 * the preview would have shown.
 *
 * The one thing to get right here is the letter timer: the keyer arms it for
 * `letterSplit` on every release, so a silence longer than that closes the
 * character before the next press arrives. Feeding the silences without it
 * would test a decoder the app does not run.
 */
function play(events: Event[], sliderWpm: number, trace = false) {
  const decoder = new AdaptiveDecoder(basesFromWpm(sliderWpm));
  const frames: string[] = [];

  for (const event of events) {
    if ('sound' in event) {
      const split = (decoder.bases.dot + decoder.bases.dash) / 2;
      decoder.addSound(event.sound);
      if (trace) {
        console.log(
          `  sound ${String(event.sound).padStart(4)}  split ${split.toFixed(0).padStart(4)}` +
            `  -> ${decoder.pending.slice(-1)}   ${describe(decoder)}`
        );
      }
    } else {
      const split = decoder.letterSplit;
      const word = decoder.wordSplit;
      if (event.silence >= split) decoder.closeLetter();
      decoder.addSilence(event.silence);
      if (trace) {
        const kind = event.silence >= word ? 'word' : event.silence >= split ? 'letter' : 'element';
        console.log(
          `  quiet ${String(event.silence).padStart(4)}  split ${split.toFixed(0).padStart(4)}` +
            `  -> ${kind.padEnd(7)} ${describe(decoder)}   "${render(decoder)}"`
        );
      }
    }
    frames.push(render(decoder));
  }
  decoder.closeLetter();
  frames.push(render(decoder));

  return { text: render(decoder), frames, wpm: wpmOf(decoder.bases) };
}

function describe(decoder: AdaptiveDecoder): string {
  const { dot, dash, charGap } = decoder.bases;
  return `dot=${dot.toFixed(0)} dash=${dash.toFixed(0)} chargap=${charGap.toFixed(0)}`;
}

/**
 * Whether anything the operator had already read changed behind their back.
 *
 * The committed part of a frame — everything before the character still being
 * keyed — may only ever grow. If one frame's committed text is not a prefix of
 * a later one's, a letter was rewritten, and that is the bug this mode exists
 * to avoid however good the final reading looks.
 */
function instability(frames: string[]): string | null {
  let committed = '';
  for (const frame of frames) {
    const done = frame.includes(' ') ? frame.slice(0, frame.indexOf(' ')) : frame;
    if (!done.startsWith(committed)) return `"${committed}" became "${done}"`;
    if (done.length > committed.length) committed = done;
  }
  return null;
}

/* ------------------------------------------------------------------ *
 * One message, keyed slowly enough to watch
 * ------------------------------------------------------------------ */

if (args.includes('--trace')) {
  const text = flag('trace') || 'hello world';
  const from = Number(flag('wpm', '20'));
  const to = Number(flag('to', String(from)));
  const slider = Number(flag('slider', String(from)));
  const hand: Hand = {
    ...TEXTBOOK,
    jitter: Number(flag('jitter', '15')) / 100,
    gap: Number(flag('gap', '1')),
    letterGap: Number(flag('lettergap', '3')),
    wordGap: Number(flag('wordgap', '7')),
  };

  console.log(
    `"${text}" keyed at ${from}->${to} wpm, ${flag('jitter', '15')}% jitter, ` +
      `slider at ${slider}\n`
  );
  const { text: got, frames, wpm } = play(key(text, from, to, hand), slider, true);
  const bad = instability(frames);
  console.log(`\nread as "${got}", measured ${wpm} wpm`);
  if (bad) console.log(`UNSTABLE: ${bad}`);
  process.exit(bad ? 1 : 0);
}

/* ------------------------------------------------------------------ *
 * The sweep
 * ------------------------------------------------------------------ */

const TEXTS = [
  'hello world',
  'cq cq de morsechat',
  'the quick brown fox',
  'sos sos',
  'test message here',
  // the reported failure: a dot-heavy letter a long way into a message
  'this is a longer message with hi and sos in it',
];
const SEEDS = 8;

/** name, wpm at the start, wpm at the end, the hand, what the slider says */
const CONDITIONS: [string, number, number, Partial<Hand>, number][] = [
  ['metronome, slider right', 15, 15, {}, 15],
  ['metronome, 25% jitter', 15, 15, { jitter: 0.25 }, 15],
  ['metronome, 40% jitter', 15, 15, { jitter: 0.4 }, 15],
  ['slider 12, hand 20', 20, 20, { jitter: 0.15 }, 12],
  ['slider 12, hand 6', 6, 6, { jitter: 0.15 }, 12],
  ['slowing 18 -> 9', 18, 9, { jitter: 0.15 }, 18],
  ['speeding 9 -> 18', 9, 18, { jitter: 0.15 }, 9],
  ['slider 3x too fast', 24, 8, { jitter: 0.15 }, 24],
  // A person, not a metronome: the hand comes back up slowly between elements
  // and stops to think between letters. Textbook proportions are what a keyer
  // generates, not what a hand does, and the decoder has to read the hand.
  // Note the word gaps: an operator who leaves five dits between letters does
  // not leave seven between words, they leave a beat. Keeping the textbook 7
  // here made the two indistinguishable and tested nothing but the fixture.
  ['loose hand (gaps 1.6, 5)', 14, 14, { gap: 1.6, letterGap: 5, wordGap: 12, jitter: 0.25 }, 14],
  ['loose hand, slider wrong', 14, 14, { gap: 1.6, letterGap: 5, wordGap: 12, jitter: 0.25 }, 12],
  [
    'loose hand, long dashes',
    14,
    14,
    { dash: 4, gap: 1.6, letterGap: 5, wordGap: 12, jitter: 0.25 },
    14,
  ],
  ['very loose (gaps 2, 6)', 12, 12, { gap: 2, letterGap: 6, wordGap: 14, jitter: 0.3 }, 12],
];

console.log(`${TEXTS.length} phrases x ${SEEDS} hands per condition\n`);
console.log(`  ${'condition'.padEnd(26)} ${'tail'.padEnd(8)} ${'chars'.padEnd(6)} unstable`);

let failures = 0;
for (const [name, from, to, shape, slider] of CONDITIONS) {
  const hand: Hand = { ...TEXTBOOK, ...shape };
  let chars = 0;
  let runs = 0;
  let tail = 0;
  let unstable = 0;

  for (const text of TEXTS) {
    for (let seed = 1; seed <= SEEDS; seed++) {
      const { text: got, frames } = play(key(text, from, to, hand, seed), slider);
      const want = text.replace(/ /g, '');
      runs++;

      let same = 0;
      for (let i = 0; i < Math.min(got.length, want.length); i++) {
        if (got[i] === want[i]) same++;
      }
      chars += same / Math.max(got.length, want.length);
      if (got.endsWith(want.slice(2))) tail++;
      if (instability(frames)) unstable++;
    }
  }

  failures += unstable;
  console.log(
    `  ${name.padEnd(26)} ${`${tail}/${runs}`.padEnd(8)} ` +
      `${`${((100 * chars) / runs).toFixed(0)}%`.padEnd(6)} ${unstable}`
  );
}

if (args.includes('--show')) {
  const hand: Hand = { ...TEXTBOOK, gap: 2, letterGap: 6, wordGap: 14, jitter: 0.3 };
  console.log('\nvery loose hand, what it actually reads:');
  for (const text of TEXTS) {
    for (let seed = 1; seed <= 3; seed++) {
      const { text: got, wpm } = play(key(text, 12, 12, hand, seed), 12);
      console.log(`  want "${text.replace(/ /g, '')}"\n   got "${got}"  (measured ${wpm} wpm, hand is 12)`);
    }
  }
}

console.log(
  failures
    ? `\n${failures} messages were rewritten behind the operator. That is the bug.`
    : '\nnothing was ever rewritten behind the operator.'
);
process.exit(failures ? 1 : 0);
