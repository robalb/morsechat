export interface Binding {
  action: string;
  keys: string[];
}

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
