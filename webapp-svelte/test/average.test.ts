/**
 * average.ts, held to what it did before.
 *
 * decoders.test.ts asks whether the whole-message decoder is any good, on five
 * hand-keyed messages, through the playground's replay. This asks a narrower
 * question that a refactor needs and that one cannot answer: does it still do
 * exactly what it did? Every generated hand of test/synth.ts and every
 * recording of the corpus goes through the whole public surface, and the answers
 * are compared against test/golden/average.json character for character.
 *
 * Some of those frozen answers are wrong readings — the hand whose dashes are
 * only 1.6 dots is read as a message of pure dots, because that is what
 * `SEPARATION` is for, and the one that pauses inside its letters comes apart
 * into single letters. They are frozen anyway. The record is of behaviour, and
 * a refactor that fixes a reading by accident has changed the algorithm as
 * surely as one that breaks a reading.
 *
 * A deliberate change to the algorithm is landed by regenerating the record:
 *
 *   node --experimental-strip-types --import ./test/loader.mjs test/make-golden.ts
 *
 * and the diff is then the change, in readings rather than in code.
 *
 * The tests after the golden one are the ones that survive a regeneration: they
 * say what the algorithm is *for*, on hands whose speed is known because it was
 * generated, and they would still fail if the record were regenerated from
 * something broken.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';

import { measure, decodeMessage } from '$lib/morse/average';
import getDialect from '$lib/utils/dialects';

import { ALL_CASES, read, GOLDEN_PATH, type Reading } from './average-cases.ts';
import { CASES, synth, hand } from './synth.ts';

const GOLDEN: Reading[] = JSON.parse(readFileSync(GOLDEN_PATH, 'utf8'));

const find = (id: string) => {
  const one = CASES.find((c) => c.id === id);
  assert.ok(one, `no case "${id}" in test/synth.ts`);
  return one;
};

describe('average.ts reads every case exactly as it used to', () => {
  test('the record covers the cases', () => {
    assert.deepEqual(
      GOLDEN.map((r) => r.id),
      ALL_CASES.map((c) => c.id),
      'test/golden/average.json is stale: regenerate it with test/make-golden.ts'
    );
  });

  for (const [i, one] of ALL_CASES.entries()) {
    test(one.id, () => {
      assert.deepEqual(read(one), GOLDEN[i]);
    });
  }
});

/* ------------------------------------------------------------------ *
 * What the measurement is for, on hands whose speed is not in doubt
 * because it was generated
 * ------------------------------------------------------------------ */

describe('the measurement', () => {
  test('finds the dot of a textbook hand at any speed', () => {
    for (const wpm of [5, 10, 15, 20, 30, 45]) {
      const dot = measure(synth('the quick brown fox', hand({ wpm })))?.dot ?? null;
      assert.ok(dot !== null && Math.abs(dot - 1200 / wpm) < 0.1 * (1200 / wpm), `${wpm}wpm read as ${dot}ms`);
    }
  });

  test('survives a wobbly hand', () => {
    for (const id of ['pangram/sloppy', 'long/sloppy', 'hello/sloppy']) {
      const one = find(id);
      const dot = measure(one.buffer)?.dot ?? null;
      assert.ok(dot !== null && Math.abs(dot - 1200 / one.wpm) < 0.25 * (1200 / one.wpm), `${id} read as ${dot}ms`);
    }
  });

  test('reads a hand with very long dashes as slower than it is', () => {
    // Not a bug to be fixed here, and worth stating so it is not mistaken for
    // one: the long group is read as three dots because that is what a dash is,
    // so a hand keying dashes at seven dots has its dot pulled up towards
    // 1.7 times the real one. It costs nothing — the decode that follows uses
    // the same inflated unit for the gaps, and the letters come out — but a
    // refactor that "fixed" the number would be changing the algorithm.
    const one = find('pangram/heavy_dash');
    const dot = measure(one.buffer)?.dot ?? null;
    const real = 1200 / one.wpm;
    assert.ok(dot !== null && dot > real && dot < 2 * real, `${dot}ms against a real ${real}ms`);
    // and the message is still read correctly, which is the point
    assert.equal(GOLDEN[ALL_CASES.indexOf(one)].text.replace(/\s+/g, ' ').trim(), one.text);
  });

  test('refuses to cut one cloud of presses in two', () => {
    // a message of nothing but dots has a mean like any other, and half its
    // dots fall below it: a decoder that always splits reports a hand twice as
    // fast as the one that keyed it
    const one = find('dots/textbook');
    const measured = measure(one.buffer);
    assert.ok(measured);
    assert.equal(measured.separated, false);
    assert.equal(measured.dashes, 0);
    assert.ok(Math.abs(measured.dot - 1200 / one.wpm) < 0.1 * (1200 / one.wpm), `${measured.dot}ms`);
  });

  test('and refuses when the two clusters are too close to be two things', () => {
    // dashes at 1.6 dots, under the separation the algorithm insists on
    assert.equal(measure(find('hello/narrow_dash').buffer)?.separated, false);
  });

  test('reads a message of nothing but dashes as one cluster too', () => {
    // one cluster again, but of long presses. Nothing in the buffer says they
    // are three dots rather than one, and the reading that loses least is the
    // presses as they came: a hand read as three times too slow would put every
    // gap in the wrong class.
    const measured = measure(find('all_dash/textbook').buffer);
    assert.ok(measured);
    assert.equal(measured.separated, false);
    assert.equal(measured.dashes, 0);
  });

  test('finds the one dot in a message of fifteen dashes', () => {
    const one = find('dash_heavy/textbook');
    const measured = measure(one.buffer);
    assert.ok(measured);
    assert.equal(measured.separated, true);
    assert.equal(measured.dashes, 15);
    assert.ok(Math.abs(measured.dot - 1200 / one.wpm) < 0.1 * (1200 / one.wpm), `${measured.dot}ms`);
  });

  test('is not moved much by a key left down', () => {
    // the geometric mean's job: one 9-second press in a normal message
    const clean = measure(find('hello/sloppy').buffer)?.dot ?? null;
    const stuck = measure(find('edge/stuck-key').buffer)?.dot ?? null;
    assert.ok(clean !== null && stuck !== null);
    assert.ok(Math.abs(stuck - clean) < 0.3 * clean, `${clean}ms became ${stuck}ms`);
  });

  test('stays inside the speeds the app allows', () => {
    for (const id of ['edge/too-fast', 'edge/too-slow']) {
      const dot = measure(find(id).buffer)?.dot ?? null;
      assert.ok(dot !== null && dot >= 20 && dot <= 600, `${id}: ${dot}ms`);
    }
  });

  test('has nothing to say about an empty buffer', () => {
    assert.equal(measure([]), null);
    // and the decode then falls back on the wpm the message travelled with
    assert.equal(
      decodeMessage([], { dialect: getDialect('international'), showReadable: true, wpm: 17 }),
      ''
    );
  });

  test('measures a single press as itself', () => {
    const measured = measure([80]);
    assert.ok(measured);
    assert.equal(measured.separated, false);
    assert.ok(Math.abs(measured.dot - 80) < 1, `${measured.dot}`);
  });
});

/* ------------------------------------------------------------------ *
 * And what the decode is for
 * ------------------------------------------------------------------ */

describe('the decode', () => {
  /**
   * The hands there is no excuse for missing: their elements are clearly
   * shorter than their dashes and their letter gaps clearly longer than the
   * gaps inside a letter, however fast, slow or drifting they are.
   *
   * `sloppy` is not among them — a third of a dot of wobble on every duration
   * is a hand that is genuinely ambiguous in places, and it has its own,
   * looser test below. Nor are the two hands the algorithm is known to lose:
   * `narrow_dash`, whose dashes are under the separation it insists on, and
   * `hesitant`, which pauses inside its letters as long as it pauses between
   * them.
   */
  const CLEAN = ['textbook', 'fast', 'slow', 'heavy_dash', 'drifting', 'very_fast', 'very_slow'];

  const letters = (text: string) => text.trim().toLowerCase().replace(/\s+/g, '');

  /** how much of a reading is the message, letter for letter */
  const agreement = (got: string, want: string): number => {
    const a = letters(got);
    const b = letters(want);
    let same = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] === b[i]) same++;
    return same / Math.max(a.length, b.length, 1);
  };

  /** every generated case with the given profile, and what it was read as */
  const profile = (name: string) =>
    CASES.filter((c) => c.id.endsWith(`/${name}`)).map((c) => ({
      one: c,
      got: GOLDEN[ALL_CASES.indexOf(c)].text,
    }));

  test('reads back every well-formed hand it is given', () => {
    const missed: string[] = [];
    for (const name of CLEAN) {
      for (const { one, got } of profile(name)) {
        // a hand of nothing but dashes cannot be told from one of nothing but
        // dots, by this or by anything else that only has the buffer
        if (one.id.startsWith('all_dash/')) continue;
        if (letters(got) !== letters(one.text)) missed.push(`${one.id}: "${got}"`);
      }
    }
    assert.deepEqual(missed, []);
  });

  test('mostly reads back a hand that wobbles by a third of a dot', () => {
    for (const { one, got } of profile('sloppy')) {
      if (one.id.startsWith('all_dash/') || one.id.startsWith('dash_heavy/')) continue;
      assert.ok(agreement(got, one.text) >= 0.85, `${one.id}: "${got}" for "${one.text}"`);
    }
  });

  test('puts the word breaks where the hand put them', () => {
    for (const id of ['hello/textbook', 'pangram/textbook', 'long/textbook']) {
      const one = find(id);
      const got = GOLDEN[ALL_CASES.indexOf(one)];
      assert.equal(got.text.trim().toLowerCase().replace(/\s+/g, ' '), one.text);
    }
  });
});
