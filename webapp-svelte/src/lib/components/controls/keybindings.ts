/**
 * The shape the keybindings panel and its edit popup work with, and the set of
 * keys the popup offers.
 *
 * The react app stores one key per action (state/types.ts `Keybinds`, ported
 * from userSlice); the panel here holds a list per action, which is what the
 * popup edits. When the state migration lands, this is the type the settings
 * slice has to satisfy — until then the panel owns its own placeholder copy.
 */
export interface Binding {
  action: string;
  keys: string[];
}

/** The letter keys of a keyboard, which is all the popup offers: no modifiers
 * and no special keys, so nothing here can shadow a browser shortcut. `space`
 * is already bound by the react app, so it can appear in a binding — it just
 * cannot be added back once removed. */
export const KEYBOARD_LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');

/** The letters not already taken by this binding. */
export function availableLetters(used: string[]): string[] {
  const taken = new Set(used.map((k) => k.toLowerCase()));
  return KEYBOARD_LETTERS.filter((letter) => !taken.has(letter));
}
