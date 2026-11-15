const PENDING = /(?:^| )([.–]+)$/;

export function normalize(text) {
  return text.replaceAll('–', '-').replace(/\s+/g, ' ').trim().toLowerCase();
}

function split(text, readable) {
  if (!readable) {
    const cut = text.lastIndexOf(' ') + 1;
    return { committed: text.slice(0, cut), pending: text.slice(cut) };
  }
  const match = PENDING.exec(text);
  return match
    ? { committed: text.slice(0, match.index), pending: match[1] }
    : { committed: text, pending: '' };
}

function transition(prev, next, readable) {
  if (next === '') return { kind: prev === '' ? 'empty' : 'clear' };
  const a = split(prev, readable);
  const b = split(next, readable);
  if (!b.committed.startsWith(a.committed)) {
    let common = 0;
    while (common < a.committed.length && a.committed[common] === b.committed[common]) common++;
    return { kind: 'rewrite', lost: a.committed.slice(common), added: b.committed.slice(common) };
  }
  if (b.committed.length > a.committed.length) {
    const added = b.committed.slice(a.committed.length);
    if (readable && a.pending) return { kind: 'resolve', code: a.pending, as: added.trim() };
    return { kind: 'append', added };
  }
  if (b.pending.startsWith(a.pending)) return { kind: 'grow', pending: b.pending };
  return { kind: 'rewrite', lost: a.pending, added: b.pending };
}

export function decisions(buffer, dot) {
  return buffer.map((ms, i) => {
    if (i % 2 === 0) return ms < 3 * dot ? '.' : '-';
    return ms < 3 * dot ? '' : ms < 7 * dot ? ' ' : '/';
  });
}

function nearThreshold(ms, i, dot) {
  const bounds = i % 2 === 0 ? [3 * dot] : [3 * dot, 7 * dot];
  return bounds.some((bound) => Math.abs(ms - bound) <= 0.05 * bound);
}

function lastBefore(events, t) {
  let found = null;
  for (const event of events) {
    if (event.t > t) break;
    found = event;
  }
  return found;
}

export function analyzeTrack({ renders, readable, expected }, { inputs = [], dot }) {
  let prev = '';
  const steps = renders.map((render) => {
    const step = { ...render, ...transition(prev, render.text, readable) };
    prev = render.text;
    return step;
  });

  for (const step of steps) {
    const input = lastBefore(inputs, step.t);
    if (input) step.after = { type: input.type, control: input.control, ms: step.t - input.t };
  }

  const latencies = [];
  for (const [i, input] of inputs.entries()) {
    const until = inputs[i + 1]?.t ?? Infinity;
    const render = steps.find((step) => step.t >= input.t && step.t < until);
    if (input.type === 'up' && input.control === 'key' && render) latencies.push(render.t - input.t);
  }

  const resolveDots = [];
  let grown = null;
  for (const step of steps) {
    if (step.kind === 'grow') grown = step;
    if (step.kind === 'resolve' && grown) resolveDots.push((step.t - grown.t) / dot);
  }

  const lastInput = inputs.at(-1)?.t ?? -Infinity;
  const final = [...renders].reverse().find((render) => render.text !== '')?.text ?? '';
  return {
    steps,
    rewrites: steps.filter((step) => step.kind === 'rewrite'),
    clears: steps.filter((step) => step.kind === 'clear').length,
    earlyClears: steps.filter((step) => step.kind === 'clear' && step.t < lastInput).length,
    final,
    expected,
    match: expected === undefined ? null : normalize(final) === normalize(expected),
    latencies,
    resolveDots,
  };
}

export function analyzeTiming(buffer, dot, planned, intended) {
  if (!buffer?.length) return null;
  const measured = decisions(buffer, dot);
  const keyed = planned ? decisions(planned, dot) : null;
  const errors = [];
  for (const [i, decision] of measured.entries()) {
    const meant = intended?.[i] ?? keyed?.[i];
    if (meant === undefined || decision === meant) continue;
    const cause = keyed && keyed[i] !== meant ? 'hand' : 'transit';
    errors.push({ i, measured: buffer[i], planned: planned?.[i], decision, meant, cause });
  }
  const expectedLength = intended?.length ?? planned?.length;
  return {
    count: buffer.length,
    near: buffer.filter((ms, i) => nearThreshold(ms, i, dot)).length,
    maxError: planned ? Math.max(...buffer.map((ms, i) => Math.abs(ms - (planned[i] ?? ms)))) : undefined,
    lengthMismatch: expectedLength !== undefined && buffer.length !== expectedLength,
    errors,
    dot,
  };
}

const NAMES = { '.': 'dot', '-': 'dash', '': 'element gap', ' ': 'letter gap', '/': 'word gap' };

const range = (values) =>
  values.length === 0
    ? '–'
    : `${Math.min(...values).toFixed(1)}–${Math.max(...values).toFixed(1)}`;

export function describeTrack(name, analysis) {
  const lines = [];
  const verdict =
    analysis.match === null ? '' : analysis.match ? '  ✓ matches' : `  ✗ expected ${JSON.stringify(analysis.expected)}`;
  lines.push(`  ${name.padEnd(9)} ${JSON.stringify(analysis.final)}${verdict}`);
  if (analysis.latencies.length) {
    lines.push(`  ${''.padEnd(9)} release→render ≤ ${Math.max(...analysis.latencies)}ms`);
  }
  if (analysis.resolveDots.length) {
    lines.push(
      `  ${''.padEnd(9)} ${analysis.resolveDots.length} letters resolved, ${range(analysis.resolveDots)} dots after their last element`
    );
  }
  if (analysis.earlyClears) {
    lines.push(`  ${''.padEnd(9)} ✗ cleared ${analysis.earlyClears}× while keying: the auto-send countdown fired mid-message`);
  }
  if (analysis.rewrites.length === 0) {
    lines.push(`  ${''.padEnd(9)} jitter: none`);
  } else {
    lines.push(`  ${''.padEnd(9)} ✗ jitter: ${analysis.rewrites.length} rewrite(s)`);
    for (const step of analysis.rewrites) {
      const after = step.after ? `, ${step.after.ms}ms after ${step.after.type} ${step.after.control}` : '';
      lines.push(
        `  ${''.padEnd(11)}lost ${JSON.stringify(step.lost)} added ${JSON.stringify(step.added)} → ${JSON.stringify(step.text)}${after}`
      );
    }
  }
  return lines;
}

export function describeTiming(timing) {
  if (!timing) return [];
  const parts = [`app measured ${timing.count} durations`, `${timing.near} within 5% of a threshold`];
  if (timing.maxError !== undefined) parts.splice(1, 0, `max error ${timing.maxError}ms vs plan`);
  const lines = [`  timing    ${parts.join(', ')}`];
  if (timing.lengthMismatch) lines.push('  ✗ the app recorded a different number of durations than were keyed, so only the first error below is meaningful');
  const dots = (ms) => `${ms}ms = ${(ms / timing.dot).toFixed(2)} dots`;
  for (const error of timing.lengthMismatch ? timing.errors.slice(0, 1) : timing.errors) {
    const kind = error.i % 2 ? 'gap' : 'press';
    const read = `the app read ${NAMES[error.decision]}`;
    lines.push(
      error.cause === 'hand'
        ? `  ✗ ${kind} #${error.i} meant ${NAMES[error.meant]} but was keyed ${dots(error.planned)}, ${read}: the hand was ambiguous`
        : `  ✗ ${kind} #${error.i} meant ${NAMES[error.meant]}${error.planned === undefined ? '' : `, keyed ${dots(error.planned)}`}, measured ${dots(error.measured)}, ${read}: lost between the input and the app`
    );
  }
  return lines;
}

function bufferDelta(prev, next, dot) {
  if (!next) return '';
  const from = prev && prev.length <= next.length ? prev.length : 0;
  return next
    .slice(from)
    .map((ms, i) => `${(from + i) % 2 ? 'gap' : 'press'} ${ms}ms = ${(ms / dot).toFixed(2)} dots`)
    .join(', ');
}

export function timeline(inputs, steps, dot, field = 'text') {
  const origin = Math.min(inputs[0]?.t ?? Infinity, steps[0]?.t ?? Infinity);
  const rows = [
    ...inputs.map((input) => ({ t: input.t, order: 0, input })),
    ...steps.map((step) => ({ t: step.t, order: 1, step })),
  ].sort((a, b) => a.t - b.t || a.order - b.order);

  let previousBuffer = null;
  const lines = [`${'t(ms)'.padStart(7)}  ${'input'.padEnd(8)}  ${field.padEnd(34)}  change`];
  for (const row of rows) {
    const t = String(row.t - origin).padStart(7);
    if (row.input) {
      const arrow = row.input.type === 'down' ? '↓' : '↑';
      lines.push(`${t}  ${`${arrow} ${row.input.control}`.padEnd(8)}`);
      continue;
    }
    const { step } = row;
    const detail = {
      grow: () => '',
      resolve: () => `${JSON.stringify(step.code)} → ${JSON.stringify(step.as)}`,
      append: () => `+${JSON.stringify(step.added)}`,
      rewrite: () => `JITTER lost ${JSON.stringify(step.lost)} added ${JSON.stringify(step.added)}`,
      clear: () => '',
      empty: () => '',
    }[step.kind]();
    const measured = bufferDelta(previousBuffer, step.buffer, dot);
    if (step.buffer) previousBuffer = step.buffer;
    lines.push(
      `${t}  ${''.padEnd(8)}  ${JSON.stringify(step[field] ?? step.text).padEnd(34)}  ${step.kind}${detail ? ` ${detail}` : ''}${measured ? `   [${measured}]` : ''}`
    );
  }
  return lines.join('\n');
}
