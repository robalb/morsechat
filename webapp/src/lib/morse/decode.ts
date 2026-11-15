import type { Dialect } from '$lib/utils/dialects';

const DASH = '–';

export interface RenderOptions {
  wpm: number;
  dialect: Dialect;
  readable: boolean;
  complete: boolean;
}

export function dotLength(wpm: number): number {
  return Math.floor(1200 / Math.min(Math.max(wpm, 1), 200));
}

function lookup(dialect: Dialect, code: string): string {
  return Object.hasOwn(dialect.table, code) ? dialect.table[code] : ` ${code} `;
}

export function render(buffer: number[], { wpm, dialect, readable, complete }: RenderOptions): string {
  const dot = dotLength(wpm);
  let out = '';
  let letter = '';

  buffer.forEach((ms, i) => {
    if (i % 2 === 0) {
      letter += ms < 3 * dot ? '.' : '-';
    } else if (ms >= 3 * dot) {
      out += (readable ? lookup(dialect, letter) : `${letter} `) + (ms >= 7 * dot ? '  ' : '');
      letter = '';
    }
  });

  if (letter) {
    if (!readable) out += letter;
    else if (complete) out += lookup(dialect, letter);
    else out += ` ${letter}`;
  }

  return out.replaceAll('-', DASH);
}
