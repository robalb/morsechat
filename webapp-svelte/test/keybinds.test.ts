/**
 * lib/morse/keybinds.ts: what a key press means.
 *
 * The matcher is the one thing between the settings panel and the key, and it
 * is a pure function over a KeyboardEvent, so it is tested as one — no browser
 * and no svelte. The events are the shape the matcher reads rather than real
 * ones: `isTrusted` cannot be set on a constructed KeyboardEvent, which is the
 * whole point of the guard that reads it.
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import type { Keybinds } from '$lib/api/types';
import { eventKey, matchAction, isEditable } from '$lib/morse/keybinds';

const BINDS: Keybinds = {
  straight: ['space', 'c'],
  yambic_left: ['z'],
  yambic_right: ['x'],
  transmit: ['w'],
  cancel_message: ['p'],
};

/** a key press as much as the matcher reads of one */
function press(key: string, over: Partial<KeyboardEvent> = {}): KeyboardEvent {
  return {
    key,
    isTrusted: true,
    repeat: false,
    target: null,
    ...over,
  } as unknown as KeyboardEvent;
}

/** an element with the tag name given, as much of one as the guard reads */
function target(tag: string, contentEditable = false): EventTarget {
  return { tagName: tag, isContentEditable: contentEditable } as unknown as EventTarget;
}

const straight = (e: KeyboardEvent) => matchAction(e, BINDS, { mode: 'straight' });
const iambic = (e: KeyboardEvent) => matchAction(e, BINDS, { mode: 'yambic' });

describe('the key names', () => {
  test('the space bar is "space", the name it is bound under', () => {
    assert.equal(eventKey(press(' ')), 'space');
  });

  test('a letter is its lowercase self, shift held or not', () => {
    assert.equal(eventKey(press('c')), 'c');
    assert.equal(eventKey(press('C')), 'c');
  });
});

describe('matching', () => {
  test('every key of an action works, not just the first', () => {
    assert.equal(straight(press(' ')), 'straight');
    assert.equal(straight(press('c')), 'straight');
  });

  test('a key bound to nothing is nothing', () => {
    assert.equal(straight(press('q')), null);
  });

  test('the case a key arrives in does not matter', () => {
    assert.equal(straight(press('C')), 'straight');
    assert.equal(matchAction(press('C'), { ...BINDS, straight: ['C'] }, { mode: 'straight' }), 'straight');
  });

  test('an action with no keys at all matches nothing', () => {
    const unbound = { ...BINDS, straight: [] };
    assert.equal(matchAction(press('c'), unbound, { mode: 'straight' }), null);
    assert.equal(matchAction(press(' '), unbound, { mode: 'straight' }), null);
  });

  test('transmit and cancel are read in every mode', () => {
    assert.equal(straight(press('w')), 'transmit');
    assert.equal(iambic(press('w')), 'transmit');
    assert.equal(straight(press('p')), 'cancel');
    assert.equal(iambic(press('p')), 'cancel');
  });
});

describe('the mode decides which keys key', () => {
  test('in a straight mode the paddles do nothing', () => {
    assert.equal(straight(press('z')), null);
    assert.equal(straight(press('x')), null);
  });

  // out with the mode it drives (lib/api/types.ts):
  // test('and both straight modes read the straight key', () => {
  //   assert.equal(matchAction(press('c'), BINDS, { mode: 'straight_dynamic' }), 'straight');
  // });

  test('in iambic the paddles key and the straight key does not', () => {
    assert.equal(iambic(press('z')), 'left');
    assert.equal(iambic(press('x')), 'right');
    assert.equal(iambic(press('c')), null);
    assert.equal(iambic(press(' ')), null);
  });
});

describe('a key bound twice', () => {
  // the popup will not let this be made, but settings saved before it could
  // edit them can hold it, and it has to land somewhere predictable
  test('the actions that act on the message win over the ones that write it', () => {
    const doubled: Keybinds = { ...BINDS, straight: ['space', 'c'], cancel_message: ['c'] };
    assert.equal(matchAction(press('c'), doubled, { mode: 'straight' }), 'cancel');
  });

  test('and cancel wins over transmit', () => {
    const doubled: Keybinds = { ...BINDS, transmit: ['p'], cancel_message: ['p'] };
    assert.equal(matchAction(press('p'), doubled, { mode: 'straight' }), 'cancel');
  });
});

describe('the guards', () => {
  test('a synthetic event was not keyed by a person', () => {
    assert.equal(straight(press('c', { isTrusted: false })), null);
  });

  test('a held key repeating is not a new press', () => {
    assert.equal(straight(press('c', { repeat: true })), null);
  });

  test('a key pressed into a text field is being typed, not keyed', () => {
    for (const tag of ['INPUT', 'TEXTAREA', 'SELECT']) {
      assert.equal(straight(press('c', { target: target(tag) })), null, tag);
    }
    assert.equal(straight(press('c', { target: target('DIV', true) })), null);
  });

  test('but a key pressed into the page itself is', () => {
    assert.equal(straight(press('c', { target: target('DIV') })), 'straight');
  });
});

describe('isEditable', () => {
  test('anything that is not an element is not editable', () => {
    assert.equal(isEditable(null), false);
  });
});
