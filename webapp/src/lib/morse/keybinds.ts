import type { KeyMode, Keybinds } from '$lib/api/types';

export type KeyAction = 'straight' | 'left' | 'right' | 'transmit' | 'cancel';

export function eventKey(e: KeyboardEvent): string {
  return e.key === ' ' ? 'space' : e.key.toLowerCase();
}

export function isEditable(target: EventTarget | null): boolean {
  const element = target as Partial<HTMLElement> | null;
  if (!element || typeof element.tagName !== 'string') return false;
  if (element.isContentEditable) return true;
  const tag = element.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

function bound(keys: string[] | undefined, key: string): boolean {
  return !!keys?.some((k) => k.toLowerCase() === key);
}

export function matchAction(e: KeyboardEvent, keybinds: Keybinds, mode: KeyMode): KeyAction | null {
  if (!e.isTrusted || e.repeat || isEditable(e.target)) return null;

  const key = eventKey(e);
  if (bound(keybinds.cancel_message, key)) return 'cancel';
  if (bound(keybinds.transmit, key)) return 'transmit';

  if (mode === 'yambic') {
    if (bound(keybinds.yambic_left, key)) return 'left';
    if (bound(keybinds.yambic_right, key)) return 'right';
    return null;
  }

  return bound(keybinds.straight, key) ? 'straight' : null;
}
