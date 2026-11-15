import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { dotLength, render } from '$lib/morse/decode';
import getDialect from '$lib/utils/dialects';

const dialect = getDialect('international');
const read = (buffer: number[], wpm: number, complete = true) =>
  render(buffer, { wpm, dialect, readable: true, complete });
const morse = (buffer: number[], wpm: number) =>
  render(buffer, { wpm, dialect, readable: false, complete: true });

describe('render', () => {
  test('matches backend/internal/morse/decode_test.go', () => {
    const cases: [number[], number, string][] = [
      [[72], 12, 'e'],
      [[534], 12, 't'],
      [[46, 105, 42, 88, 39, 502, 429, 115, 446, 103, 406, 540, 54, 97, 30, 110, 23], 17, 's o s'],
      [
        [
          280, 403, 49, 101, 53, 97, 44, 86, 62, 406, 59, 949, 229, 114, 237, 95, 47, 105, 370, 414, 59, 92,
          65, 85, 394, 391, 63, 73, 62, 420, 273, 90, 38, 113, 285, 79, 53, 415, 262, 102, 30, 121, 414, 803,
          230, 94, 46, 100, 46, 85, 54, 413, 62, 93, 261, 86, 46, 449, 342, 121, 309, 102, 357, 295, 55, 88,
          317, 99, 345, 404, 317, 102, 53, 792, 62, 99, 47, 111, 332, 93, 46, 488, 368, 154, 291, 105, 356,
          341, 245, 112, 39, 110, 39, 98, 453,
        ],
        16,
        'the quick brown fox',
      ],
      [[], 16, ''],
    ];
    for (const [buffer, wpm, expected] of cases) {
      assert.equal(read(buffer, wpm).replace(/\s+/g, ' '), expected);
    }
  });

  test('uses the same dot length as the backend', () => {
    assert.equal(dotLength(17), 70);
    assert.equal(dotLength(0), 1200);
  });

  test('splits presses at three dots and gaps at three and seven', () => {
    assert.equal(read([150], 20), 'e');
    assert.equal(read([60, 150, 180], 20), 'a');
    assert.equal(read([60, 180, 60], 20), 'ee');
    assert.equal(read([60, 420, 60], 20), 'e  e');
  });

  test('shows the letter being keyed as morse until it is complete', () => {
    assert.equal(read([60, 180, 180, 60, 60], 20, false), 'e –.');
    assert.equal(read([60, 180, 180, 60, 60], 20, true), 'en');
  });

  test('renders morse with letters and words spaced apart', () => {
    assert.equal(morse([60, 180, 180, 420, 60], 20), '. –   .');
  });

  test('shows an unknown code as itself', () => {
    assert.equal(read(Array(17).fill(60), 20), ' ......... ');
  });
});
