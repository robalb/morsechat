#!/usr/bin/env node
import { analyzeTiming, analyzeTrack, describeTiming, describeTrack, timeline } from './lib/analyze.js';
import { collect, dialectTable, launch, openApp, recordPreview, sleep } from './lib/app.js';
import { appSettings, expectedFor, list, message, MESSAGE_OPTIONS, parse, save, source } from './lib/cli.js';
import { INPUTS, openDevice, perform, performIambic } from './lib/input.js';
import { dotLength, intendedDecisions, wordsToMorse } from './lib/morse.js';

const USAGE = `usage: node type.js [options]

Keys morse into the message preview and records every render of it.

what to key (one of):
  --text TEXT        text in the selected dialect (default "hello world")
  --morse CODE       dots and dashes, letters split by spaces, words by "/"
  --timings LIST     a raw straight key buffer: press,gap,press,... in ms
  --expect TEXT      what the preview should end up showing (derived when omitted)

how to key it:
  --input LIST       keyboard,mouse,pen,touch or all      (default keyboard)
  --mode LIST        straight,iambic or all                (default straight)
  --squeeze          iambic: hold both paddles across dit/dah alternations
  --button NAME      mouse/pen button: left, right, middle (default left)
  --wpm N            the app's speed and the operator's   (default 12)
  --slop F           every duration keyed F slower         (default 0.1)
  --wobble F         random ±F on every duration           (default 0)
  --seed N           seed for --wobble                     (default 1)
  --gap D --letter-gap D --word-gap D   gaps in dots       (default 1, 3, 7)

the app:
  --url URL          the webapp dev server   (default http://localhost:5173)
  --channel NAME     channel to key on       (default training: nothing is sent)
  --dialect NAME     international, russian, wabun, extended, temp_prosign
  --view text|morse  the show_readable setting             (default text)
  --submit-delay N   the app's submit_delay setting, 5-50
  --settle MS        how long to keep recording after the last input

output:
  --out DIR          where logs go (default runs/)
  --timeline         also print the render timeline
  --screenshot       save a png of the page at the end
  --headful          show the browser

Exits 1 if any run renders the wrong text, rewrites text it already showed,
or clears the preview while keying.`;

const values = parse(
  {
    ...MESSAGE_OPTIONS,
    input: { type: 'string', default: 'keyboard' },
    channel: { type: 'string', default: 'training' },
    settle: { type: 'string' },
  },
  USAGE
);

async function run(browser, input, mode) {
  const app = await openApp(browser, {
    url: values.url,
    channel: values.channel,
    touch: input === 'touch',
    settings: appSettings(values, mode),
  });
  try {
    const { page, settings } = app;
    const dot = dotLength(settings.wpm);
    const readable = settings.show_readable;
    const msg = message(values, mode, await dialectTable(page, settings.dialect));
    const expected = expectedFor(msg, readable);
    const device = await openDevice(page, input, settings, { button: values.button });

    await recordPreview(page);
    const { inputs } = msg.letters
      ? await performIambic(page, device, msg.letters, dot)
      : await perform(device, msg.plan);
    await sleep(Number(values.settle ?? Math.max(3 * dot + 500, 1000)));
    const { preview, system } = await collect(page);

    const analysis = analyzeTrack({ renders: preview, readable, expected }, { inputs, dot });
    const buffer = [...preview].reverse().find((render) => render.buffer.length)?.buffer;
    const intended = msg.words ? intendedDecisions(msg.words) : null;
    const timing = analyzeTiming(buffer, dot, msg.planned, intended);
    const squeeze = mode === 'iambic' && values.squeeze;
    const label = `${input}-${mode}${squeeze ? '-squeeze' : ''}`;
    const keyed = msg.words ? wordsToMorse(msg.words) : msg.planned.join(',');

    const report = [
      `${input} / ${mode}${squeeze ? ' + squeeze' : ''} — ${settings.wpm} wpm (dot ${dot}ms), ${readable ? 'text' : 'morse'} view, ${settings.dialect}, ${device.describe()}`,
      `  keyed     ${source(values)}: ${keyed}`,
      `  driver    ${inputs.length} inputs, up to ${Math.max(0, ...inputs.map((i) => i.late))}ms late`,
      ...describeTrack('preview', analysis),
      ...describeTiming(timing),
      ...system.map((line) => `  system    ${line}`),
      ...app.errors.map((error) => `  ⚠ page    ${error}`),
    ].join('\n');

    const log = {
      kind: 'type',
      meta: { input, mode, squeeze, url: values.url, channel: app.channel, callsign: app.callsign, dot, readable,
        dialect: settings.dialect, wpm: settings.wpm, keyed, expected, options: values },
      plan: msg.plan ?? msg.letters,
      planned: msg.planned,
      intended,
      inputs,
      preview,
      system,
      errors: app.errors,
    };
    const steps = timeline(inputs, analysis.steps, dot);
    const base = await save(values.out, label, log, `${report}\n\n${steps}`);
    if (values.screenshot) await page.screenshot({ path: `${base}.png` });

    console.log(report);
    console.log(`  log       ${base}.json ${base}.txt${values.screenshot ? ` ${base}.png` : ''}\n`);
    if (values.timeline) console.log(`${steps}\n`);
    return analysis.match !== false && analysis.rewrites.length === 0 && analysis.earlyClears === 0;
  } finally {
    await app.context.close();
  }
}

const browser = await launch(values);
let failures = 0;
try {
  for (const mode of list(values.mode, ['straight', 'iambic'])) {
    for (const input of list(values.input, INPUTS)) {
      if (mode === 'iambic' && values.squeeze && (input === 'mouse' || input === 'pen')) {
        console.log(`${input} / iambic + squeeze — skipped: one pointer cannot hold both paddles\n`);
        continue;
      }
      if (!(await run(browser, input, mode))) failures++;
    }
  }
} finally {
  await browser.close();
}
process.exit(failures ? 1 : 0);
