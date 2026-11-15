import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

import { iambicLetters, morseToWords, straightPlan, straightTimings, textToWords } from './morse.js';

export const MESSAGE_OPTIONS = {
  url: { type: 'string', default: 'http://localhost:5173' },
  text: { type: 'string' },
  morse: { type: 'string' },
  timings: { type: 'string' },
  expect: { type: 'string' },
  mode: { type: 'string', default: 'straight' },
  squeeze: { type: 'boolean', default: false },
  wpm: { type: 'string', default: '12' },
  dialect: { type: 'string', default: 'international' },
  view: { type: 'string', default: 'text' },
  slop: { type: 'string', default: '0.1' },
  wobble: { type: 'string', default: '0' },
  seed: { type: 'string', default: '1' },
  gap: { type: 'string', default: '1' },
  'letter-gap': { type: 'string', default: '3' },
  'word-gap': { type: 'string', default: '7' },
  button: { type: 'string', default: 'left' },
  'submit-delay': { type: 'string' },
  out: { type: 'string', default: 'runs' },
  headful: { type: 'boolean', default: false },
  screenshot: { type: 'boolean', default: false },
  timeline: { type: 'boolean', default: false },
  help: { type: 'boolean', default: false },
};

export function parse(options, usage) {
  const { values } = parseArgs({ options, allowPositionals: false });
  if (values.help) {
    console.log(usage);
    process.exit(0);
  }
  return values;
}

export function source(values) {
  if (values.timings) return 'timings';
  if (values.morse) return 'morse';
  return JSON.stringify(values.text ?? 'hello world');
}

export function list(value, all) {
  const items = value.split(',').map((item) => item.trim()).filter(Boolean);
  return items.includes('all') ? all : items;
}

export function hand(values) {
  return {
    wpm: Number(values.wpm),
    slop: Number(values.slop),
    wobble: Number(values.wobble),
    seed: Number(values.seed),
    gap: Number(values.gap),
    letterGap: Number(values['letter-gap']),
    wordGap: Number(values['word-gap']),
  };
}

export function expectedFor(msg, readable) {
  return readable ? msg.expectedText : msg.expectedMorse;
}

export function appSettings(values, mode) {
  const settings = {
    key_mode: mode === 'iambic' ? 'yambic' : 'straight',
    wpm: Number(values.wpm),
    dialect: values.dialect,
    show_readable: values.view !== 'morse',
  };
  if (values['submit-delay']) settings.submit_delay = Number(values['submit-delay']);
  return settings;
}

export function message(values, mode, table) {
  if (values.timings) {
    if (mode === 'iambic') throw new Error('--timings is a straight key buffer, it cannot be keyed with paddles');
    const timings = values.timings.split(',').map(Number);
    return { words: null, planned: timings, plan: straightPlan(timings), expectedText: values.expect, expectedMorse: undefined };
  }

  if (!table) throw new Error(`unknown dialect "${values.dialect}"`);
  const words = values.morse
    ? morseToWords(values.morse)
    : textToWords(values.text ?? 'hello world', table);
  const expectedText =
    values.expect ?? words.map((word) => word.map((code) => table[code] ?? ` ${code} `).join('')).join(' ');
  const expectedMorse = words.flat().join(' ');

  if (mode === 'iambic') {
    const letters = iambicLetters(words, hand(values), values.squeeze);
    return { words, planned: null, letters, expectedText, expectedMorse };
  }
  const planned = straightTimings(words, hand(values));
  return { words, planned, plan: straightPlan(planned), expectedText, expectedMorse };
}

export async function save(dir, label, log, text) {
  await mkdir(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const base = join(dir, `${stamp}-${label}`);
  await writeFile(`${base}.json`, `${JSON.stringify(log, null, 2)}\n`);
  await writeFile(`${base}.txt`, `${text}\n`);
  return base;
}
