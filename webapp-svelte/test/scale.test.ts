/**
 * scale.ts, held to what it did before and to what it promised.
 *
 * Same bargain as test/window.test.ts: every generated hand of test/synth.ts and
 * every recording of the corpus is typed into the decoder element by element,
 * and what came out is compared against test/golden/scale.json — where the text
 * was committed, what was on screen at the end, and a hash of every frame in
 * between.
 *
 * Frozen readings include the ones that are wrong: the hand whose dashes are 1.6
 * dots is read as pure dots by this too, and that is the right answer to a
 * question with no other one. A change that moves any of it is landed by
 * regenerating the record, and the diff is the change:
 *
 *   node --experimental-strip-types --import ./test/loader.mjs test/make-golden.ts
 *
 * The tests after the golden one survive a regeneration: they are checked
 * against the replay itself, not against the record, and each of them is one of
 * the requirements in docs/morse-decoder-spec.md §4.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';

import getDialect from '$lib/utils/dialects';
import { renderLetters } from '$lib/morse/decode';
import { ScaleDecoder, decodeTimings } from '$lib/morse/scale';

import { ALL_CASES, read, GOLDEN_PATH, type Reading } from './scale-cases.ts';
import { CASES } from './synth.ts';
import { SAVED_RECORDINGS } from '$lib/playground/recordings';

const GOLDEN: Reading[] = JSON.parse(readFileSync(GOLDEN_PATH, 'utf8'));
const READINGS = new Map(ALL_CASES.map((one) => [one.id, read(one)]));

const DIALECT = getDialect('international');
const isCharacter = (code: string) => Object.hasOwn(DIALECT.table, code);

const reading = (id: string): Reading => {
  const found = READINGS.get(id);
  assert.ok(found, `no case "${id}"`);
  return found;
};

/** the codes of a line, read back through the table */
const letters = (line: string): string =>
  line
    .split(' ')
    .filter((code) => code && code !== '/')
    .map((code) => DIALECT.table[code] ?? `[${code}]`)
    .join('');

const flat = (text: string) => text.trim().toLowerCase().replace(/\s+/g, '');

/** how many characters into a message this decoder may still change its mind,
 * as lib/morse/scale.ts is configured (R8) */
const FLICKER_LETTERS = 4;

/**
 * The profiles there is no excuse for missing. `narrow_dash` is not among them —
 * its dashes are under the separation every decoder here insists on, and reading
 * it as dots is the specified behaviour — and `sloppy` has its own, looser test.
 */
const CLEAN = ['textbook', 'fast', 'slow', 'heavy_dash', 'hesitant', 'drifting', 'very_fast', 'very_slow'];

const cases = (profiles: string[], texts?: string[]) =>
  CASES.filter((one) => {
    const [text, profile] = one.id.split('/');
    return profiles.includes(profile) && (texts === undefined || texts.includes(text));
  });

describe('scale.ts reads every case exactly as it used to', () => {
  test('the record covers the cases', () => {
    assert.deepEqual(
      GOLDEN.map((r) => r.id),
      ALL_CASES.map((c) => c.id),
      'test/golden/scale.json is stale: regenerate it with test/make-golden.ts'
    );
  });

  for (const [i, one] of ALL_CASES.entries()) {
    test(one.id, () => {
      // `frames(one)` in test/scale-cases.ts prints what the operator saw, when
      // the hash is the only thing that disagrees
      assert.deepEqual(reading(one.id), GOLDEN[i]);
    });
  }
});

/* ------------------------------------------------------------------ *
 * R8 — the no-flicker promise
 * ------------------------------------------------------------------ */

describe('the promise', () => {
  for (const one of ALL_CASES) {
    test(`committed text only ever grows — ${one.id}`, () => {
      const { committed } = reading(one.id);
      for (let i = 1; i < committed.length; i++) {
        assert.ok(
          committed[i].startsWith(committed[i - 1]),
          `"${committed[i - 1]}" became "${committed[i]}"`
        );
      }
    });
  }

  test('nothing past the flicker budget is ever re-read', () => {
    // The budget is spent all at once: while a message is inside it nothing is
    // committed at all, and the character that takes it past commits everything
    // behind it. So the largest step the committed text ever takes is the budget
    // plus the character that ended it, and everything after that is one
    // character at a time.
    for (const one of ALL_CASES) {
      const first = reading(one.id).committed.find((f) => f !== '');
      if (first === undefined) continue;
      assert.ok(
        first.split(' ').filter((c) => c && c !== '/').length <= FLICKER_LETTERS + 1,
        `${one.id}: committed ${first} in one step`
      );
    }
  });
});

/* ------------------------------------------------------------------ *
 * R2, R3 — following the hand, and reading elements as a group
 * ------------------------------------------------------------------ */

describe('the fit', () => {
  test('reads back every well-formed hand it is given', () => {
    // All eighty of them: every text, including the messages of nothing but
    // dashes and the two-element `et`, against every profile there is no excuse
    // for missing — the seven-dot dashes, the hand that pauses inside letters,
    // the one that speeds up by a third, and both ends of the speed range.
    const missed: string[] = [];
    for (const one of cases(CLEAN)) {
      const got = letters(reading(one.id).visible);
      if (got !== flat(one.text)) missed.push(`${one.id}: "${got}"`);
    }
    assert.deepEqual(missed, []);
  });

  test('reads a hand that wobbles by a third of a dot', () => {
    // The same texts test/window.test.ts holds the window search to, and for
    // the same reason: `dash_heavy` is fifteen dashes with one dot among them,
    // and at a third of a dot of wobble the two clouds genuinely overlap.
    //
    // The floor is set by `mixed/sloppy`, where the `de` of `cq de morsechat`
    // runs together into an `s`. Four of the six read exactly.
    for (const one of cases(['sloppy'], ['hello', 'pangram', 'dots', 'mixed', 'numbers', 'long'])) {
      const got = letters(reading(one.id).visible);
      assert.ok(agreement(got, flat(one.text)) >= 0.9, `${one.id}: "${got}" for "${one.text}"`);
    }
  });

  test('reads the hesitant hand the whole-message average comes apart on', () => {
    // pauses inside a letter as long as the textbook's letter gap, which a
    // decoder that commits one element at a time cannot recover from
    assert.equal(letters(reading('hello/hesitant').visible), 'helloworld');
    assert.equal(letters(reading('pangram/hesitant').visible), 'thequickbrownfox');
  });

  test('produces no run of three lone elements in any hand it can read', () => {
    // `eeee` and `tttt`, the shape a message collapses into when the boundary
    // lands on the wrong side of every press
    for (const one of cases([...CLEAN, 'sloppy'])) {
      const shown = letters(reading(one.id).visible);
      assert.ok(!/(e{3,}|t{3,})/.test(shown), `${one.id}: "${shown}"`);
    }
  });

  test('reads a dash barely longer than a dot as one cloud, not two', () => {
    // 1.6 dots, under the separation `MIN_DASH_RATIO` insists on. Not a failure:
    // a hand that does not separate its two elements has not keyed two, and
    // there is no reading that could recover what it meant.
    assert.equal(letters(reading('dots/narrow_dash').visible), 'hissisis');
    assert.ok(!/[-]/.test(reading('hello/narrow_dash').visible));
  });
});

/* ------------------------------------------------------------------ *
 * R4, R5 — the declared speed, and what may be learned from
 * ------------------------------------------------------------------ */

describe('the speed', () => {
  test('reads a message of nothing but dashes, which only the speed can', () => {
    // The ambiguity of §3: `moot to` and `issees` are the same durations at two
    // speeds, and the live decoder is the one with a speed to tell them apart.
    for (const one of cases(CLEAN, ['all_dash'])) {
      assert.equal(letters(reading(one.id).visible), 'mootto', one.id);
    }
  });

  test('reads one press against the declared speed, from the first press', () => {
    // 240ms at a declared 15wpm is three dots, and there is nothing else in the
    // buffer to say so. The static decoder, which is passed no speed, reads the
    // same press as a dot — that is the ambiguity, not a disagreement.
    assert.equal(letters(reading('edge/one-dash').visible), 't');
    assert.equal(letters(decodeTimings(CASES.find((c) => c.id === 'edge/one-dash')!.buffer, { isCharacter })), 'e');
  });

  test('tracks the speed of the hand it is reading', () => {
    for (const id of ['pangram/fast', 'pangram/slow', 'long/textbook', 'long/sloppy']) {
      const one = CASES.find((c) => c.id === id)!;
      const { dot } = reading(id);
      assert.ok(Math.abs(dot - 1200 / one.wpm) < 0.3 * (1200 / one.wpm), `${id}: ${dot}ms`);
    }
  });

  test('follows a hand that speeds up by a third across a message', () => {
    const one = CASES.find((c) => c.id === 'long/drifting')!;
    const { dots } = reading('long/drifting');
    // it starts where the slider put it and ends near where the hand ended up
    assert.ok(dots.length > 5, `${dots.length} distinct estimates`);
    const end = 1200 / one.wpm / 1.33;
    assert.ok(Math.abs(dots[dots.length - 1] - end) < 0.35 * end, `${dots[dots.length - 1]}ms against ${end}ms`);
  });

  test('does not move the estimate on a message it cannot measure', () => {
    // R5: a stretch of one class of press reads at whatever speed was already
    // believed, so an estimate that learned from it would be learning from
    // itself. `all_dash` is such a message from end to end, and the estimate
    // must come out of it where the slider put it.
    for (const one of cases(CLEAN, ['all_dash'])) {
      const { dots } = reading(one.id);
      assert.deepEqual(dots, [Math.round((1200 / one.wpm) * 10) / 10], one.id);
    }
  });
});

/* ------------------------------------------------------------------ *
 * R6, R10, R11 — ending, reporting a deadline, and not being a message
 * ------------------------------------------------------------------ */

describe('the contract', () => {
  test('every message ends: nothing is left in the preview', () => {
    // What the window search cannot do with fewer than two silences, and the
    // reason keying a bare `m` in the app showed nothing at all, forever.
    for (const one of ALL_CASES) {
      assert.equal(reading(one.id).preview, '', `${one.id} never finished its last character`);
    }
  });

  test('reads a message one and two characters long', () => {
    for (const [id, want] of [['single/textbook', 'e'], ['word/textbook', 'a'], ['edge/one-press', 'e']]) {
      assert.equal(letters(reading(id).visible), want, id);
    }
  });

  test('always reports a finite split, from before the first press', () => {
    // What the keyer waits on with a timer, and `setTimeout(fn, Infinity)` fires
    // immediately: that bug read the first dot of every message as a finished
    // `e`. Every boundary here is a multiple of a dot, so there is no reading
    // that can put one at infinity.
    for (const id of ['single/textbook', 'pair/textbook', 'hello/textbook', 'dots/sloppy']) {
      const one = CASES.find((c) => c.id === id)!;
      const decoder = new ScaleDecoder(1200 / one.wpm, { isCharacter });
      const finite = () => {
        assert.ok(Number.isFinite(decoder.letterSplit) && decoder.letterSplit > 0, `${id}: ${decoder.letterSplit}`);
        assert.ok(decoder.wordSplit > decoder.letterSplit, `${id}: ${decoder.wordSplit}`);
      };
      finite();
      for (const [i, ms] of one.buffer.entries()) {
        if (i % 2 === 0) decoder.addSound(ms);
        else decoder.addSilence(ms);
        finite();
      }
    }
  });

  test('survives the shapes that are not messages', () => {
    for (const one of ALL_CASES.filter((c) => c.id.startsWith('edge/'))) {
      assert.doesNotThrow(() => read(one), one.id);
      assert.doesNotThrow(() => decodeTimings(one.buffer, { isCharacter }), one.id);
    }
    const empty = reading('edge/empty');
    assert.equal(empty.visible, '');
    assert.equal(empty.preview, '');
    assert.equal(decodeTimings([], { isCharacter }), '');
  });

  test('is deterministic and clock-free', () => {
    // R12: the golden record is only worth having if the same input is the same
    // output on every run, and nothing here reads a clock to make it otherwise.
    for (const one of ALL_CASES) {
      assert.deepEqual(read(one), reading(one.id), one.id);
    }
  });
});

/* ------------------------------------------------------------------ *
 * R14 — the live decoder and the finished-message one agree
 * ------------------------------------------------------------------ */

describe('the two readings', () => {
  test('agree on every clean hand that keyed both a dot and a dash', () => {
    const differ: string[] = [];
    for (const one of cases(CLEAN)) {
      // `all_dash` is the one message they cannot agree on, because only one of
      // them is told the speed that would settle it — and `pair` is two
      // elements, which nothing settles
      if (one.id.startsWith('all_dash/') || one.id.startsWith('pair/')) continue;
      const live = letters(reading(one.id).visible);
      const still = letters(decodeTimings(one.buffer, { isCharacter }));
      if (live !== still) differ.push(`${one.id}: live "${live}", finished "${still}"`);
    }
    assert.deepEqual(differ, []);
  });
});

/* ------------------------------------------------------------------ *
 * The way the chat's key drives it
 *
 * lib/morse/keyer.svelte.ts feeds a live decoder from a real key: elements as
 * they are keyed, and an animation frame telling it how long the key has been up
 * in between. That path has no unit test of its own — it is svelte state and a
 * rAF loop — so its call pattern is reproduced here, because it is the one the
 * app ships and a decoder that only reads well under the playground's pattern is
 * a decoder that reads well nowhere it matters.
 * ------------------------------------------------------------------ */

describe('the keyer pattern', () => {
  const TICK = 16;

  /** what the preview would show, keyed and ticked as the keyer does it */
  const keyed = (buffer: number[], wpm: number): string => {
    const decoder = new ScaleDecoder(1200 / wpm, { isCharacter });

    const quiet = (total: number) => {
      for (let elapsed = TICK; elapsed <= total; elapsed += TICK) {
        decoder.idle(elapsed);
        if (elapsed >= decoder.wordSplit) {
          decoder.flush();
          return;
        }
      }
    };

    for (const [i, ms] of buffer.entries()) {
      if (i % 2 === 0) decoder.addSound(ms);
      else {
        quiet(ms);
        decoder.addSilence(ms);
      }
    }
    quiet(4000);
    return renderLetters(decoder.visible, decoder.preview, {
      dialect: DIALECT,
      showReadable: true,
    });
  };

  for (const recording of SAVED_RECORDINGS.filter((r) => r.expected.trim() !== '')) {
    test(`reads ${recording.id} the way the playground box does`, () => {
      assert.equal(
        flat(keyed(recording.buffer, recording.wpm)),
        flat(letters(reading(`corpus/${recording.id}`).visible))
      );
    });
  }

  test('does not turn an h into eeee', () => {
    // the shape of the bug this whole exercise is about: four dots keyed as one
    // letter, read as four
    for (const id of ['hello/textbook', 'hello/sloppy', 'dots/textbook', 'pangram/hesitant']) {
      const one = CASES.find((c) => c.id === id)!;
      const got = keyed(one.buffer, one.wpm);
      assert.ok(!/(e{3,}|t{3,})/i.test(got.replace(/\s+/g, '')), `${id}: "${got}"`);
    }
  });
});

/**
 * How much of a reading is the message: edits away from it, over its length.
 *
 * Not positional agreement, which the harness uses and which is too blunt here:
 * a missed letter gap runs two letters into one and shifts everything after it,
 * and a decoder that misread one gap in a sentence should not score the same as
 * one that misread the sentence.
 */
function agreement(got: string, want: string): number {
  let row = [...Array(want.length + 1).keys()];
  for (let i = 1; i <= got.length; i++) {
    const next = [i];
    for (let j = 1; j <= want.length; j++) {
      next[j] = Math.min(
        row[j] + 1,
        next[j - 1] + 1,
        row[j - 1] + (got[i - 1] === want[j - 1] ? 0 : 1)
      );
    }
    row = next;
  }
  return 1 - row[want.length] / Math.max(got.length, want.length, 1);
}
