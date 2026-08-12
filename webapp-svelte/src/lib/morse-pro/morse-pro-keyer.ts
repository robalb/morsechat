/*!
This code is © Copyright Stephen C. Phillips, 2018.
Email: steve@scphillips.com
*/
/*
Licensed under the EUPL, Version 1.2 or – as soon they will be approved by the European Commission - subsequent versions of the EUPL (the "Licence");
You may not use this work except in compliance with the Licence.
You may obtain a copy of the Licence at: https://joinup.ec.europa.eu/community/eupl/
Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the Licence for the specific language governing permissions and limitations under the Licence.
*/

/*
MODIFICATIONS (morsechat), see ./README.md:

  - converted from javascript to typescript, options object instead of
    positional arguments.
  - the class no longer owns a MorsePlayerWAA and a MorseDecoder. Upstream plays
    each element itself and pushes its length to a decoder; here it announces
    the element through `elementStart` / `elementEnd` and the caller decides
    what a "key down" means — the sidetone, the wire buffer and the preview all
    hang off those two callbacks (lib/morse/keyer.svelte.ts).
  - because the element is now announced rather than played, its end has to be
    scheduled: upstream's single timer becomes two, and `stop()` closes an
    element that is still open so the key can never be left down.
  - the silences are no longer pushed anywhere (the caller measures its own),
    but their durations still drive the timer, so the state machine and its
    `spaceCounter` are unchanged.
  - added `setSpeed()`: the app's wpm is a slider, and upstream reads it once in
    the constructor.
*/

import * as WPM from './morse-pro-wpm';

export interface MorseKeyerOptions {
  /**
   * A function which should return 0, 1, 2, or 3 from the virtual "paddle"
   * depending if nothing, a dit, a dah or both is detected. This implementation
   * will play dits if both keys are detected.
   */
  keyCallback: () => number;
  /** speed of the keyer in words per minute */
  wpm?: number;
  /** Farnsworth speed of the keyer */
  fwpm?: number;
  /** the start of a dit or a dah, with its duration in ms */
  elementStart?: (duration: number) => void;
  /** the end of the element started by `elementStart` */
  elementEnd?: () => void;
}

/**
 * The Morse keyer tests for input on a timer and announces the elements it
 * decides to send.
 *
 * @example
 * let dit = false, dah = false;
 * const keyer = new MorseKeyer({
 *     keyCallback: () => (dit ? 1 : 0) | (dah ? 2 : 0),
 *     wpm: 20,
 *     elementStart: () => sound.on(),
 *     elementEnd: () => sound.off(),
 * });
 * // on the first press of either paddle:
 * keyer.start();
 */
export default class MorseKeyer {
  keyCallback: () => number;
  wpm: number;
  fwpm: number;
  /** duration of a dit in ms */
  ditLen: number;
  fditLen: number;
  elementStart: (duration: number) => void;
  elementEnd: () => void;

  protected _state: {
    playing: boolean;
    spaceCounter: number;
    /** an element is on the air and its end is scheduled */
    sounding: boolean;
  } = { playing: false, spaceCounter: 0, sounding: false };

  private timer: ReturnType<typeof setTimeout> | undefined;
  private elementTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(options: MorseKeyerOptions) {
    const { keyCallback, wpm = 20, fwpm = wpm, elementStart, elementEnd } = options;
    this.keyCallback = keyCallback;
    this.wpm = wpm;
    this.fwpm = fwpm;
    this.elementStart = elementStart ?? (() => {});
    this.elementEnd = elementEnd ?? (() => {});

    this.ditLen = WPM.ditLength(wpm); // duration of dit in ms
    this.fditLen = WPM.fditLength(wpm, fwpm);
  }

  /**
   * Change the speed of the keyer. Takes effect at the next element, so a
   * change mid-character does not cut the current one short.
   */
  setSpeed(wpm: number, fwpm: number = wpm) {
    this.wpm = wpm;
    this.fwpm = fwpm;
    this.ditLen = WPM.ditLength(wpm);
    this.fditLen = WPM.fditLength(wpm, fwpm);
  }

  /**
   * @access: private
   */
  protected _check() {
    const key = this.keyCallback();
    const ditOrDah = this._ditOrDah(key);
    let beepLen: number; // length of beep
    let silenceLen = 0; // length of silence

    if (ditOrDah === undefined) {
      // If no keypress is detected then keep waiting out the character and the
      // space after it, then stop until the next press
      beepLen = 0;
      this._state.playing = false; // make it interuptable: means that a new char can start whenever
      switch (this._state.spaceCounter) {
        case 0:
          // we've already waited 1 ditLen, need to make it 1 fditLen plus 2 more
          silenceLen = this.fditLen - this.ditLen + 2 * this.fditLen;
          break;
        case 1:
          silenceLen = 4 * this.fditLen;
          break;
        case 2:
          silenceLen = 0;
          this.stop();
          break;
      }
      this._state.spaceCounter++;
    } else {
      this._state.spaceCounter = 0;
      beepLen = (ditOrDah ? 1 : 3) * this.ditLen;
      this._sendElement(beepLen);
      silenceLen = this.ditLen; // while playing, assume we are inside a char and so wait 1 ditLen
    }
    if (beepLen + silenceLen) {
      // check key state again after the dit or dah and after a dit-space
      this.timer = setTimeout(() => this._check(), beepLen + silenceLen);
    }
  }

  /**
   * Announce an element and schedule its end.
   * @access private
   */
  private _sendElement(duration: number) {
    this._state.sounding = true;
    this.elementStart(duration);
    this.elementTimer = setTimeout(() => {
      this._state.sounding = false;
      this.elementEnd();
    }, duration);
  }

  /**
   * Translate key input into whether to play nothing, dit, or dah
   * @returns undefined, true or false for nothing, dit or dah
   * @access: private
   */
  protected _ditOrDah(input: number): boolean | undefined {
    if (input & 1) {
      return true;
    } else if (input === 2) {
      return false;
    } else {
      return undefined;
    }
  }

  /**
   * Call this method when an initial key-press (or equivalent) is detected.
   */
  start() {
    if (this._state.playing) {
      // If the keyer is already playing then ignore a new start.
      return;
    } else {
      this._state.playing = true;
      this._state.spaceCounter = 0;
      clearTimeout(this.timer);
      this._check();
    }
  }

  /**
   * This method can be called externally to stop the keyer but is also used internally when no key-press is detected.
   */
  stop() {
    this._state.playing = false;
    clearTimeout(this.timer);
    clearTimeout(this.elementTimer);
    // an element that was on the air when we were stopped still has to end:
    // the key is a real key, and it cannot be left down
    if (this._state.sounding) {
      this._state.sounding = false;
      this.elementEnd();
    }
  }
}
