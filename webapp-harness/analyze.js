#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

import { analyzeTiming, analyzeTrack, describeTiming, describeTrack, timeline } from './lib/analyze.js';

const [path, ...flags] = process.argv.slice(2);
if (!path || path === '--help') {
  console.log('usage: node analyze.js runs/<file>.json [--timeline]\n\nRe-runs the render analysis of a saved log.');
  process.exit(path ? 0 : 1);
}

const log = JSON.parse(await readFile(path, 'utf8'));
const { dot, readable } = log.meta;
const tracks =
  log.kind === 'receive'
    ? [
        ['text', log.received, true, log.meta.expectedText, []],
        ['morse', log.received.map((entry) => ({ t: entry.t, text: entry.morse })), false, log.meta.expectedMorse, []],
        ['preview', log.preview, readable, readable ? log.meta.expectedText : log.meta.expectedMorse, log.inputs],
      ]
    : [['preview', log.preview, readable, log.meta.expected, log.inputs]];

let failures = 0;
for (const [name, renders, isReadable, expected, inputs] of tracks) {
  if (!renders?.length) continue;
  const analysis = analyzeTrack({ renders, readable: isReadable, expected }, { inputs, dot });
  console.log(describeTrack(name, analysis).join('\n'));
  if (flags.includes('--timeline')) console.log(`\n${timeline(inputs, analysis.steps, dot)}\n`);
  if (analysis.match === false || analysis.rewrites.length > 0) failures++;
}
if (log.kind === 'type') {
  const buffer = [...log.preview].reverse().find((render) => render.buffer.length)?.buffer;
  console.log(describeTiming(analyzeTiming(buffer, dot, log.planned, log.intended)).join('\n'));
}
process.exit(failures ? 1 : 0);
