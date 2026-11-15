export function dotLength(wpm) {
  return Math.floor(1200 / Math.min(Math.max(wpm, 1), 200));
}

export function textToWords(text, table) {
  const reverse = new Map();
  for (const [code, value] of Object.entries(table)) {
    if (!reverse.has(value)) reverse.set(value, code);
  }
  return text
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) =>
      [...word].map((char) => {
        const code = reverse.get(char);
        if (!code) throw new Error(`"${char}" has no code in this dialect, use --morse`);
        return code;
      })
    );
}

export function morseToWords(morse) {
  const words = morse
    .replaceAll('–', '-')
    .split('/')
    .map((word) => word.trim().split(/\s+/).filter(Boolean))
    .filter((word) => word.length > 0);
  for (const code of words.flat()) {
    if (!/^[.-]+$/.test(code)) throw new Error(`"${code}" is not a morse code`);
  }
  return words;
}

export function intendedDecisions(words) {
  const decisions = [];
  words.forEach((word) =>
    word.forEach((code, l) =>
      [...code].forEach((element, e) => {
        if (decisions.length > 0) decisions.push(e > 0 ? '' : l > 0 ? ' ' : '/');
        decisions.push(element);
      })
    )
  );
  return decisions;
}

export function wordsToMorse(words) {
  return words.map((word) => word.join(' ')).join(' / ');
}

function random(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function operator({ wpm, slop, wobble, seed }) {
  const unit = dotLength(wpm) * (1 + slop);
  const next = random(seed);
  return (dots) => Math.max(1, Math.round(dots * unit * (1 + wobble * (2 * next() - 1))));
}

export function straightTimings(words, hand) {
  const length = operator(hand);
  const timings = [];
  words.forEach((word) =>
    word.forEach((code, l) =>
      [...code].forEach((element, e) => {
        if (timings.length > 0) {
          timings.push(length(e > 0 ? hand.gap : l > 0 ? hand.letterGap : hand.wordGap));
        }
        timings.push(length(element === '.' ? 1 : 3));
      })
    )
  );
  return timings;
}

export function straightPlan(timings) {
  const plan = [];
  let at = 0;
  timings.forEach((ms, i) => {
    if (i % 2 === 0) {
      plan.push({ at, control: 'key', down: true });
      plan.push({ at: at + ms, control: 'key', down: false });
    }
    at += ms;
  });
  return plan;
}

export function iambicLetters(words, hand, squeeze) {
  const dot = dotLength(hand.wpm);
  const length = operator(hand);
  return words.flatMap((word, w) =>
    word.map((code, l) => ({
      code,
      gap: w === 0 && l === 0 ? 0 : Math.max(length(l > 0 ? hand.letterGap : hand.wordGap), 2 * dot),
      paddles: [...code].map((element, i) =>
        squeeze && i > 0 && element !== code[i - 1] ? ['dot', 'dash'] : [element === '.' ? 'dot' : 'dash']
      ),
    }))
  );
}
