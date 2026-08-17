/**
 * Where a key press becomes an action.
 *
 * The chat keyer (lib/morse/keyer.svelte.ts) and the decoder playground
 * (lib/playground/engine.svelte.ts) both listen on the window and both used to
 * carry their own copy of this — the same guards, the same normalization and
 * the same chain of comparisons, drifting apart one fix at a time. It is one
 * function now, and the settings panel writes the bindings it reads.
 *
 * Nothing here imports svelte or the session: the binds are an argument, so
 * this is a pure function over a KeyboardEvent and can be tested as one
 * (test/keybinds.test.ts), which is the same reason the decoders are plain
 * objects.
 */
import type { KeyMode, Keybinds } from '$lib/api/types';

/**
 * What a key press means. `left` and `right` are the paddles, named after the
 * bindings rather than after dot and dash, which `left_is_dot` decides.
 */
export type KeyAction = 'straight' | 'left' | 'right' | 'transmit' | 'cancel';

/**
 * The name a key is bound under: what the settings store, and what the picker
 * in the keybindings popup offers (components/controls/keybindings.ts). The
 * space bar is the one key whose `event.key` is not its name.
 */
export function eventKey(e: KeyboardEvent): string {
  return e.key === ' ' ? 'space' : e.key.toLowerCase();
}

/**
 * Whether an event landed in something the user is typing into.
 *
 * The target is read for the two properties this needs rather than tested with
 * `instanceof HTMLElement`, which is what the two copies of this did: there is
 * no such global in the node test runner, and an `instanceof` against an
 * undefined right-hand side does not return false, it throws.
 */
export function isEditable(target: EventTarget | null): boolean {
  const element = target as Partial<HTMLElement> | null;
  if (!element || typeof element.tagName !== 'string') return false;
  if (element.isContentEditable) return true;
  const tag = element.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

/** whether a key is one of the ones an action is bound to */
function bound(keys: string[] | undefined, key: string): boolean {
  return !!keys?.some((k) => k.toLowerCase() === key);
}

export interface MatchOptions {
  /**
   * Which keys are keys. In `yambic` only the paddles key; in any other mode
   * only the straight key does — a binding for the other kind does nothing,
   * rather than doubling as a straight key the way it used to.
   *
   * The playground passes a straight mode of its own rather than the setting:
   * it has one key and no paddles, and its key should not go dead because the
   * chat is in iambic.
   */
  mode: KeyMode;
}

/**
 * What a key press asks for, or null if it asks for nothing.
 *
 * The three guards come first and are the ones both callers already had: a
 * synthetic event has not been keyed by a person (the react version's
 * anti-ch3at measure), a held key repeats and a repeat is not a new press, and
 * a key pressed into a text field is being typed, not keyed — the react version
 * missed that one and keyed along with the password being entered into its own
 * login dialog.
 *
 * Then the actions, in a fixed order. The popup will not let one key be bound
 * to two actions, but settings restored from an account predate that rule, so
 * the order is spelled out rather than left to whichever comparison ran first:
 * the two that act on a message win over the ones that write it.
 */
export function matchAction(
  e: KeyboardEvent,
  keybinds: Keybinds,
  { mode }: MatchOptions,
): KeyAction | null {
  if (!e.isTrusted) return null;
  if (e.repeat) return null;
  if (isEditable(e.target)) return null;

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
