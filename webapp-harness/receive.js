#!/usr/bin/env node
import { analyzeTrack, describeTrack, normalize, timeline } from './lib/analyze.js';
import { collect, dialectTable, launch, openApp, recordChat, recordPreview, sleep } from './lib/app.js';
import { appSettings, expectedFor, message, MESSAGE_OPTIONS, parse, save, source } from './lib/cli.js';
import { openDevice, perform, performIambic } from './lib/input.js';
import { dotLength, wordsToMorse } from './lib/morse.js';

const USAGE = `usage: node receive.js [options]

Opens two anonymous users on the same channel. The sender keys a message, the
receiver gets it over the backend and plays it into its chat log; every render
of that chat line (its morse span and its text span) is recorded.

  --channel NAME     a real channel, not training         (default ch1)
  --input NAME       how the sender keys: keyboard, mouse, pen, touch
  --direct           skip the key: send the planned timings straight to the socket
  --wait MS          extra time to keep recording after playback (default 1500)

Everything else is as in type.js (--text, --morse, --timings, --mode, --wpm,
--dialect, --view, --slop, --wobble, ...). The backend lets an anonymous user
send one message every 10s (20s above 30 wpm); each run uses fresh users.`;

const values = parse(
  {
    ...MESSAGE_OPTIONS,
    input: { type: 'string', default: 'keyboard' },
    channel: { type: 'string', default: 'ch1' },
    direct: { type: 'boolean', default: false },
    wait: { type: 'string', default: '1500' },
  },
  USAGE
);
if (values.channel === 'training') throw new Error('nothing is broadcast on training, pick another channel');

const mode = values.mode;
const browser = await launch(values);
let ok = false;
try {
  const receiver = await openApp(browser, { url: values.url, channel: values.channel });
  const sender = await openApp(browser, {
    url: values.url,
    channel: values.channel,
    touch: values.input === 'touch',
    settings: appSettings(values, mode),
  });
  const { settings } = sender;
  const dot = dotLength(settings.wpm);
  const msg = message(values, mode, await dialectTable(sender.page, settings.dialect));

  await recordChat(receiver.page);
  await recordPreview(sender.page);

  const cooldown = settings.wpm > 30 ? 20000 : 10000;
  const duration = values.direct ? (msg.planned ?? []).reduce((sum, ms) => sum + ms, 0) : 0;
  const ready = sender.connectedAt - 5000 + Math.max(cooldown, duration) + 500;
  if (ready > Date.now()) {
    console.log(`waiting ${((ready - Date.now()) / 1000).toFixed(1)}s: the backend refuses a new anonymous user's first message for a while`);
    await sleep(ready - Date.now());
  }

  let inputs = [];
  if (values.direct) {
    if (!msg.planned) throw new Error('--direct needs a straight key plan, drop --mode iambic');
    await sender.page.evaluate((timings) => window.morsechat.sendMorseMessage(timings), msg.planned);
  } else {
    const device = await openDevice(sender.page, values.input, settings, { button: values.button });
    ({ inputs } = msg.letters
      ? await performIambic(sender.page, device, msg.letters, dot)
      : await perform(device, msg.plan));
  }

  const arrived = await receiver.page
    .waitForFunction(
      (callsign) => (window.__harnessChat ?? []).find((entry) => entry.callsign === callsign)?.t,
      { timeout: 20000 },
      sender.callsign
    )
    .then((handle) => handle.jsonValue())
    .catch(() => null);

  const sentPreview = (await collect(sender.page)).preview;
  const sent = msg.planned && values.direct
    ? msg.planned
    : [...sentPreview].reverse().find((render) => render.buffer.length)?.buffer ?? [];
  if (arrived) {
    const total = sent.reduce((sum, ms) => sum + ms, 0);
    await sleep(Math.max(0, arrived + total + Number(values.wait) - Date.now()));
  }

  const received = (await collect(receiver.page)).chat.filter((entry) => entry.callsign === sender.callsign);
  const { preview, system } = await collect(sender.page);
  const readable = settings.show_readable;

  const text = analyzeTrack({ renders: received, readable: true, expected: msg.expectedText }, { dot });
  const morse = analyzeTrack(
    { renders: received.map((entry) => ({ t: entry.t, text: entry.morse })), readable: false, expected: msg.expectedMorse },
    { dot }
  );
  const typed = analyzeTrack({ renders: preview, readable, expected: expectedFor(msg, readable) }, { inputs, dot });
  const agree = normalize(typed.final) === normalize(readable ? text.final : morse.final);

  const keyed = msg.words ? wordsToMorse(msg.words) : msg.planned.join(',');
  const report = [
    `receive on ${values.channel}: ${sender.callsign} → ${receiver.callsign}, ${values.direct ? 'sent directly' : `${values.input} / ${mode}`}, ${settings.wpm} wpm (dot ${dot}ms), ${settings.dialect}`,
    `  keyed     ${source(values)}: ${keyed}`,
    arrived ? `  arrived   ${received.length} renders over ${(received.at(-1).t - received[0].t) / 1000}s of playback` : '  ✗ the message never reached the receiver',
    ...(values.direct ? [] : describeTrack('preview', typed)),
    ...describeTrack('text', text),
    ...describeTrack('morse', morse),
    values.direct ? null : `  ${agree ? '✓' : '✗'} the sender's preview and the receiver's ${readable ? 'text' : 'morse'} ${agree ? 'agree' : 'disagree'}`,
    ...system.map((line) => `  system    ${line}`),
    ...[...sender.errors, ...receiver.errors].map((error) => `  ⚠ page    ${error}`),
  ].filter(Boolean).join('\n');

  const log = {
    kind: 'receive',
    meta: { input: values.direct ? 'direct' : values.input, mode, url: values.url, channel: values.channel,
      sender: sender.callsign, receiver: receiver.callsign, dot, readable, dialect: settings.dialect,
      wpm: settings.wpm, keyed, expectedText: msg.expectedText, expectedMorse: msg.expectedMorse, options: values },
    plan: msg.plan ?? msg.letters,
    planned: msg.planned,
    sent,
    inputs,
    preview,
    received,
    system,
    errors: { sender: sender.errors, receiver: receiver.errors },
  };
  const sections = [
    report,
    'receiver text span', timeline([], text.steps, dot, 'text'),
    'receiver morse span', timeline([], morse.steps.map((step) => ({ ...step, morse: step.text })), dot, 'morse'),
    ...(values.direct ? [] : ['sender preview', timeline(inputs, typed.steps, dot)]),
  ];
  const base = await save(values.out, `receive-${values.direct ? 'direct' : values.input}-${mode}`, log, sections.join('\n\n'));
  if (values.screenshot) await receiver.page.screenshot({ path: `${base}.png` });

  console.log(report);
  console.log(`  log       ${base}.json ${base}.txt${values.screenshot ? ` ${base}.png` : ''}`);
  if (values.timeline) console.log(`\n${sections.slice(1).join('\n\n')}`);
  ok = Boolean(arrived) && text.match !== false && morse.match !== false &&
    text.rewrites.length === 0 && morse.rewrites.length === 0 && (values.direct || agree);
} finally {
  await browser.close();
}
process.exit(ok ? 0 : 1);
