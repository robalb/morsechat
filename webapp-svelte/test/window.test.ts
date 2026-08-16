/**
 * window.ts, held to what it did before.
 *
 * Same bargain as test/average.test.ts: every generated hand of test/synth.ts
 * and every recording of the corpus is typed into the decoder element by
 * element, and what came out is compared against test/golden/window.json —
 * where the text froze, what was on screen at the end, and a hash of every
 * frame in between.
 *
 * Frozen readings include the ones that are wrong: the hand whose dashes are
 * 1.6 dots is read as pure dots by this too. A refactor that fixes one has
 * changed the algorithm as surely as one that breaks one, and the way to land
 * that is to regenerate the record:
 *
 *   node --experimental-strip-types --import ./test/loader.mjs test/make-golden.ts
 *
 * The tests after the golden one survive a regeneration: the promise about
 * frozen letters is checked against the replay itself, not against the record.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';

import getDialect from '$lib/utils/dialects';

import { ALL_CASES, read, GOLDEN_PATH, type Reading } from './window-cases.ts';
import { CASES } from './synth.ts';

const GOLDEN: Reading[] = JSON.parse(readFileSync(GOLDEN_PATH, 'utf8'));
const READINGS = new Map(ALL_CASES.map((one) => [one.id, read(one)]));

const DIALECT = getDialect('international');

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

/** how many letters into a message this decoder may still change its mind, as
 * lib/morse/window.ts is configured */
const FLICKER_LETTERS = 4;

describe('window.ts reads every case exactly as it used to', () => {
  test('the record covers the cases', () => {
    assert.deepEqual(
      GOLDEN.map((r) => r.id),
      ALL_CASES.map((c) => c.id),
      'test/golden/window.json is stale: regenerate it with test/make-golden.ts'
    );
  });

  for (const [i, one] of ALL_CASES.entries()) {
    test(one.id, () => {
      // `frames(one)` in test/window-cases.ts prints what the operator saw,
      // when the hash is the only thing that disagrees
      assert.deepEqual(reading(one.id), GOLDEN[i]);
    });
  }
});

/* ------------------------------------------------------------------ *
 * The promise: a letter, once shown as a letter, is never touched again
 * ------------------------------------------------------------------ */

describe('the promise', () => {
  for (const one of ALL_CASES) {
    test(`frozen text only ever grows — ${one.id}`, () => {
      const { froze } = reading(one.id);
      for (let i = 1; i < froze.length; i++) {
        assert.ok(
          froze[i].startsWith(froze[i - 1]),
          `"${froze[i - 1]}" became "${froze[i]}"`
        );
      }
    });
  }

  test('what is re-read is only ever the first few letters', () => {
    // the window may change its mind while the message is short — that is what
    // it is built on — but never about text that has been frozen, and the
    // freeze happens once the message is past its flicker budget
    for (const one of ALL_CASES) {
      const { froze } = reading(one.id);
      const first = froze.find((f) => f !== '');
      if (first === undefined) continue;
      assert.ok(
        first.split(' ').filter((c) => c && c !== '/').length <= FLICKER_LETTERS + 1,
        `${one.id}: froze ${first} in one step`
      );
    }
  });
});

/* ------------------------------------------------------------------ *
 * What the search is for
 * ------------------------------------------------------------------ */

describe('the search', () => {
  /**
   * The profiles there is no excuse for missing. `narrow_dash` is not among
   * them — its dashes are under the separation every decoder here insists on —
   * and `sloppy` has its own, looser test below.
   */
  const CLEAN = ['textbook', 'fast', 'slow', 'heavy_dash', 'hesitant', 'drifting', 'very_fast', 'very_slow'];

  /**
   * The messages there is something to read. Two are excluded for the same
   * reason: a hand of nothing but dashes cannot be told from one of nothing but
   * dots by anything that only has the buffer, and `dash_heavy` is fifteen
   * dashes with a single dot hidden in them. Three more are one and two letters
   * long — see the test below for what this decoder does with those.
   */
  const READABLE = ['hello', 'pangram', 'dots', 'mixed', 'numbers', 'long'];

  const cases = (profiles: string[]) =>
    CASES.filter((one) => {
      const [text, profile] = one.id.split('/');
      return READABLE.includes(text) && profiles.includes(profile);
    });

  /**
   * How much of a reading is the message: edits away from it, over its length.
   *
   * Not positional agreement, which the harness uses and which is too blunt
   * here: a missed letter gap runs two letters into one and shifts everything
   * after it, and a decoder that misread one gap in a sentence should not score
   * the same as one that misread the sentence.
   */
  const agreement = (got: string, want: string): number => {
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
  };

  test('reads back every well-formed hand it is given', () => {
    const missed: string[] = [];
    for (const one of cases(CLEAN)) {
      const got = letters(reading(one.id).visible);
      if (got !== flat(one.text)) missed.push(`${one.id}: "${got}"`);
    }
    assert.deepEqual(missed, []);
  });

  test('mostly reads back a hand that wobbles by a third of a dot', () => {
    for (const one of cases(['sloppy'])) {
      const got = letters(reading(one.id).visible);
      // within one edit of the message: `mixed/sloppy` runs `de` into a `b`
      assert.ok(agreement(got, flat(one.text)) >= 0.8, `${one.id}: "${got}" for "${one.text}"`);
    }
  });

  test('shows a message of one or two letters as elements and never as letters', () => {
    // Not a bug to fix here, and worth stating so it is not mistaken for one: a
    // threshold comes from a jump between two of the window's own durations, so
    // a message with fewer than two silences in it has no letter gap to offer
    // and nothing that could end its last character. It stays in the preview as
    // the dots and dashes it was keyed as until a third element arrives — which
    // for a live decoder means "until the operator keys more".
    for (const id of ['single/textbook', 'pair/textbook', 'word/textbook']) {
      assert.equal(reading(id).visible, '', id);
      assert.ok(reading(id).preview.length > 0, id);
    }
  });

  test('reads the hesitant hand the whole-message average comes apart on', () => {
    // the reason this decoder exists: pauses inside a letter as long as the
    // textbook's letter gap, which a decoder that commits one element at a time
    // cannot recover from
    assert.equal(letters(reading('hello/hesitant').visible), 'helloworld');
    assert.equal(letters(reading('pangram/hesitant').visible), 'thequickbrownfox');
  });

  test('produces no run of three lone elements in a well-formed hand', () => {
    // `eeee` and `tttt`, the shape a message collapses into when the split
    // lands on the wrong side of every press
    for (const one of cases([...CLEAN, 'sloppy'])) {
      const shown = letters(reading(one.id).visible);
      assert.ok(!/(e{3,}|t{3,})/.test(shown), `${one.id}: "${shown}"`);
    }
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

  test('says nothing about an empty message', () => {
    const empty = reading('edge/empty');
    assert.equal(empty.visible, '');
    assert.equal(empty.preview, '');
  });
});
