import { DASH_CHAR, lookup } from '$lib/morse/decode';
import { morseTimes, type MorseTimes } from '$lib/morse/timings';
import type { MessageMorse } from '$lib/socket/types';
import { user } from '$lib/state/session.svelte';
import { scrollDown } from '$lib/utils/chatDom';
import getDialect, { type Dialect } from '$lib/utils/dialects';

import { DEFAULT_FREQUENCY, Tone } from './audio';

const PLAY_FOR_DISCONNECTED = false;

export type SoundPermission = (callsign: string) => boolean | undefined;

class SenderTone {
  readonly #tone: Tone;
  readonly #callsign: string;
  readonly #permission: SoundPermission;
  #lastKnown = PLAY_FOR_DISCONNECTED;

  /**
   * @param callsign - the sender, which the mute flag is looked up by
   * @param frequency - the sender's note in hz, 0 for the default
   * @param permission - reads the mute flag, undefined once the sender has left
   */
  constructor(callsign: string, frequency: number, permission: SoundPermission) {
    this.#callsign = callsign;
    this.#permission = permission;
    this.#tone = new Tone(frequency || DEFAULT_FREQUENCY, 0);
  }

  /**
   * Sounds the tone unless the sender is muted, at the current
   * `user.settings.volume_receiver`. Asked once per element, so muting takes
   * effect mid-message.
   */
  on() {
    if (!this.#allowed()) return;
    this.#tone.volume = user.settings.volume_receiver;
    this.#tone.on();
  }

  /** Silences the tone, whatever the mute flag now says. */
  off() {
    this.#tone.off();
  }

  /** Releases the audio nodes at the end of the message. */
  disconnect() {
    this.#tone.disconnect();
  }

  /**
   * @returns whether the sender may be heard, falling back to the last answer
   * given while they were still in the channel
   */
  #allowed(): boolean {
    const permission = this.#permission(this.#callsign);
    if (permission === undefined) return this.#lastKnown;
    this.#lastKnown = permission;
    return permission;
  }
}

class Playback {
  readonly #message: number[];
  readonly #times: MorseTimes;
  readonly #dialect: Dialect;
  readonly #tone: SenderTone;
  readonly #morse: HTMLElement;
  readonly #text: HTMLElement;

  #index = 0;
  #letter = '';
  #morseOut = '';
  #textOut = '';

  #timer: ReturnType<typeof setTimeout> | undefined;
  #start = 0;
  #elapsed = 0;

  /**
   * @param message - the broadcast, whose wpm and dialect everything is read
   * against: the sender's, not the reader's
   * @param tone - switched on and off once per element
   * @param morse - the span showing dots and dashes
   * @param text - the span showing the decoded letters
   */
  constructor(
    message: MessageMorse,
    tone: SenderTone,
    morse: HTMLElement,
    text: HTMLElement
  ) {
    this.#message = message.message;
    this.#times = morseTimes(message.wpm);
    this.#dialect = getDialect(message.dialect);
    this.#tone = tone;
    this.#morse = morse;
    this.#text = text;
  }

  /** Starts typing and sounding the message. */
  start() {
    this.#start = Date.now();
    this.#step();
  }

  /** Abandons the message where it is, releases the tone and leaves `active`. */
  stop() {
    clearTimeout(this.#timer);
    this.#timer = undefined;
    this.#tone.off();
    this.#tone.disconnect();
    active.delete(this);
  }

  /**
   * Plays one entry of the buffer and schedules the next. An even index is a
   * press, which sounds the tone and adds a dot or a dash; an odd one is a
   * silence, which ends a letter or a word when it is long enough. The delay is
   * taken from an absolute clock, so a long message does not drift slower than
   * it was keyed.
   */
  #step() {
    const i = this.#index;
    if (i >= this.#message.length) {
      this.#finish();
      return;
    }

    const ms = this.#message[i];
    if (i % 2 === 0) {
      this.#tone.on();
      this.#letter += ms < this.#times.dash ? '.' : DASH_CHAR;
    } else {
      this.#tone.off();
      if (ms > this.#times.wordGap) {
        this.#commit('   ', '  ');
      } else if (ms > this.#times.letterGap) {
        this.#commit(' ', '');
      }
    }

    this.#draw();
    this.#index = i + 1;

    this.#elapsed += ms;
    const delay = Math.max(0, this.#elapsed - (Date.now() - this.#start));
    this.#timer = setTimeout(() => this.#step(), delay);
  }

  /**
   * Ends the message: the buffer stops on a press, so this is the release that
   * silences the tone and reads the last letter.
   */
  #finish() {
    this.#tone.off();
    if (this.#letter) this.#textOut += this.#read(this.#letter);
    this.#morse.innerText = this.#morseOut + this.#letter;
    this.#text.innerText = this.#textOut;
    this.#tone.disconnect();
    active.delete(this);
  }

  /**
   * Closes the letter being spelled out and appends it to both spans.
   *
   * @param morseGap - separator written after it in the morse span
   * @param textGap - separator written after it in the text span
   */
  #commit(morseGap: string, textGap: string) {
    this.#morseOut += this.#letter + morseGap;
    this.#textOut += this.#read(this.#letter) + textGap;
    this.#letter = '';
  }

  /**
   * Rewrites both spans with the letters read so far. The letter in progress is
   * shown as its dots and dashes in both: which letter it is depends on how it
   * ends.
   */
  #draw() {
    this.#morse.innerText = this.#morseOut + this.#letter;
    this.#text.innerText = `${this.#textOut} ${this.#letter}`;
  }

  /**
   * @param letter - one character as dots and endashes
   * @returns what it says in the sender's dialect, or the code itself when the
   * dialect has no letter for it
   */
  #read(letter: string): string {
    return lookup(this.#dialect, letter.replaceAll(DASH_CHAR, '-'));
  }
}

const active = new Set<Playback>();

/**
 * Appends a received message to the chat log and plays it out at the speed it
 * was keyed, sounding a tone at the sender's frequency. The paragraph carries
 * the `data-signature` that marks it as reportable and the three spans the
 * stylesheet of <Chat /> expects: callsign, morse, text.
 *
 * @param message - the broadcast, as it came off the socket
 * @param node - the chat log; nothing is shown or played when it is null
 * @param allowSound - reads the sender's mute flag, asked once per element
 */
export function playMessage(
  message: MessageMorse,
  node: HTMLElement | null,
  allowSound: SoundPermission
) {
  if (!node) return;

  const paragraph = document.createElement('p');
  paragraph.setAttribute('data-signature', message.signature);

  const label = document.createElement('span');
  const short = getDialect(message.dialect).short_name;
  label.innerText = short ? `${message.callsign} [${short}]` : message.callsign;

  const morse = document.createElement('span');
  const text = document.createElement('span');
  paragraph.append(label, morse, text);

  const tone = new SenderTone(message.callsign, message.frequency, allowSound);
  const playback = new Playback(message, tone, morse, text);
  active.add(playback);

  node.insertAdjacentElement('beforeend', paragraph);
  scrollDown(node);

  playback.start();
}

/**
 * Stops every message still playing. Called when the channel changes, where the
 * log they are being typed into is about to be cleared.
 */
export function stopPlayback() {
  for (const playback of active) playback.stop();
  active.clear();
}
