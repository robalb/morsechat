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

/** What the popup offers: the letters, and the space bar the react app binds to
 * the straight key. No modifiers and nothing else special, so nothing here can
 * shadow a browser shortcut. */
export const KEYBOARD_KEYS = [
  ...'abcdefghijklmnopqrstuvwxyz'.split(''),
  'space',
];

/** The whole keyboard, with the keys already bound — to this action or to
 * another one — marked as taken. The picker draws all of them either way, so a
 * key missing from the popup is missing because it is not offered at all, not
 * because something else happens to hold it. */
export function keyOptions(used: string[]): { key: string; taken: boolean }[] {
  const taken = new Set(used.map((k) => k.toLowerCase()));
  return KEYBOARD_KEYS.map((key) => ({ key, taken: taken.has(key) }));
}
