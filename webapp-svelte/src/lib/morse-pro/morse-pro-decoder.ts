/*
This code is © Copyright Stephen C. Phillips, 2018.
Email: steve@scphillips.com

Licensed under the EUPL, Version 1.2 or – as soon they will be approved by the European Commission - subsequent versions of the EUPL (the "Licence");
You may not use this work except in compliance with the Licence.
You may obtain a copy of the Licence at: https://joinup.ec.europa.eu/community/eupl/
Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the Licence for the specific language governing permissions and limitations under the Licence.
*/

/*
MODIFICATIONS (morsechat), see ./README.md:

  - converted from javascript to typescript.
  - `morse2text` is a constructor option rather than an import of
    `morse-pro.js`. Upstream decodes with the international table only; this app
    has dialects, so the caller passes the lookup (lib/morse/decode.ts).
  - the constructor takes an options object instead of four positional
    arguments, since one of them is now mandatory.
  - `timings2morse`'s classification of one duration is split out into
    `classify()`, and `pendingMorse` uses it to render the timings that have not
    been flushed yet without consuming them. That is the half-typed letter of
    the message preview.
  - the `dits`/`dahs`/`ditSpaces`/`dahSpaces`/`spaces` getters and the `timings`
    and `characters` arrays that feed them are dropped: they exist for the
    adaptive decoder, which is not vendored.
*/

import * as WPM from './morse-pro-wpm';

/** what the decoder produces each time it completes a character */
export interface DecodedChunk {
  /** the millisecond timings the chunk was decoded from, signed as received */
  timings: number[];
  /** the dots and dashes, with ' ' between letters and '/' between words */
  morse: string;
  /** those dots and dashes as text, per the caller's `morse2text` */
  message: string;
}

export interface DecoderSpeed {
  wpm: number;
  fwpm: number;
}

export interface MorseDecoderOptions {
  /** the speed of the morse in words per minute */
  wpm?: number;
  /** the Farnsworth speed; the app does not use Farnsworth, so it is wpm */
  fwpm?: number;
  /**
   * How a decoded chunk of morse becomes text. A chunk is one character,
   * possibly preceded by the separator that ended the character before it, so
   * the implementation has to expect a leading ' ' or '/'.
   */
  morse2text: (morse: string) => string;
  /** called with each character as it is decoded */
  messageCallback?: (data: DecodedChunk) => void;
  /** called when the speed changes, which here only happens at construction */
  speedCallback?: (speed: DecoderSpeed) => void;
}

/**
 * Class to convert from timings to Morse code.
 *
 * @example
 * const decoder = new MorseDecoder({ wpm: 10, morse2text });
 * let t;
 * while (decoder_is_operating) {
 *     // get some timing "t" from a sensor, make it +ve for noise and -ve for silence
 *     decoder.addTiming(t);
 * }
 * decoder.flush();  // make sure all the data is pushed through the decoder
 */
export default class MorseDecoder {
  private _wpm: number | undefined = undefined;
  /** farnsworth speed */
  private _fwpm: number | undefined = undefined;
  private _ditLen: number | undefined = undefined;
  private _fditLen: number | undefined = undefined;
  private _ditDahThreshold = 0;
  private _dahSpaceThreshold = 0;

  defaults = { wpm: 20, fwpm: 20 };

  /** the timings received but not yet decoded into a character */
  unusedTimes: number[] = [];
  /** a duration <= noiseThreshold is assumed to be an error */
  noiseThreshold = 1;
  /** string of morse */
  morse = '';
  /** string of decoded message */
  message = '';

  private readonly morse2text: (morse: string) => string;
  messageCallback: (data: DecodedChunk) => void;
  speedCallback: (speed: DecoderSpeed) => void;

  constructor(options: MorseDecoderOptions) {
    const { wpm = 20, fwpm = wpm, morse2text, messageCallback, speedCallback } = options;
    this.morse2text = morse2text;
    this.messageCallback = messageCallback ?? (() => {});
    this.speedCallback = speedCallback ?? (() => {});
    this.wpm = wpm;
    this.fwpm = fwpm;
  }

  /**
   * @access private
   */
  updateThresholds() {
    this._ditDahThreshold = (1 * this._ditLen! + 3 * this._ditLen!) / 2;
    this._dahSpaceThreshold = (3 * this._fditLen! + 7 * this._fditLen!) / 2;
  }

  /**
   * Should be set to the WPM speed of the input sound.
   * The input data is validated and this.defaults.wpm will be used if there is an error in input.
   * The private _fwpm, _ditLen and _fditLen variables are also updated and the speedCallback is executed.
   */
  set wpm(wpm: number) {
    if (isNaN(wpm)) wpm = this.defaults.wpm;
    wpm = Math.max(wpm, 1);
    this._wpm = wpm;
    if (this._fwpm === undefined || this._fwpm > wpm) {
      this._fwpm = this._wpm;
    }
    this._ditLen = WPM.ditLength(this._wpm);
    this._fditLen = WPM.fditLength(this._wpm, this._fwpm);
    this.updateThresholds();
    this.speedCallback({ wpm: this.wpm, fwpm: this.fwpm });
  }

  get wpm(): number {
    return this._wpm!;
  }

  /**
   * Should be set to the Farnsworth WPM speed of the input sound.
   * The input data is validated and this.defaults.fwpm will be used if there is an error in input.
   * The private _wpm, _ditLen and _fditLen variables are also updated and the speedCallback is executed.
   */
  set fwpm(fwpm: number) {
    if (isNaN(fwpm)) fwpm = this.defaults.fwpm;
    fwpm = Math.max(fwpm, 1);
    this._fwpm = fwpm;
    if (this._wpm === undefined || this._wpm < fwpm) {
      this.wpm = fwpm;
    }
    this._ditLen = WPM.ditLength(this._wpm!);
    this._fditLen = WPM.fditLength(this._wpm!, this._fwpm);
    this.updateThresholds();
    this.speedCallback({ wpm: this.wpm, fwpm: this.fwpm });
  }

  get fwpm(): number {
    return this._fwpm!;
  }

  /**
   * Set the length of a dit the decoder will look for.
   * The private _wpm, _fwpm, and _fditLen variables are also updated.
   * @param dit - Length of a dit in ms.
   */
  set ditLen(dit: number) {
    this._ditLen = dit;
    if (this._fditLen === undefined || this._fditLen < this._ditLen) {
      this._fditLen = this._ditLen;
    }
    this._wpm = WPM.wpm(this._ditLen);
    this._fwpm = WPM.fwpm(this._wpm, this._fditLen / this._ditLen);
    this.updateThresholds();
  }

  get ditLen(): number {
    return this._ditLen!;
  }

  /**
   * Set the length of a Farnsworth dit the decoder will look for.
   * The private _wpm, _fwpm, and _ditLen variables are also updated.
   * @param fdit - Length of a Farnsworth dit in ms.
   */
  set fditLen(fdit: number) {
    this._fditLen = fdit;
    if (this._ditLen === undefined || this._ditLen > this._fditLen) {
      this._ditLen = this._fditLen;
    }
    this._wpm = WPM.wpm(this._ditLen);
    this._fwpm = WPM.fwpm(this._wpm, this._fditLen / this._ditLen);
    this.updateThresholds();
  }

  get fditLen(): number {
    return this._fditLen!;
  }

  /**
   * Add a timing in ms to the list of recorded timings.
   * The duration should be positive for a dit or dah and negative for a space.
   * If the duration is <= noiseThreshold it is assumed to be noise and is added to the previous duration.
   * If a duration is the same sign as the previous one then they are combined.
   * @param duration - millisecond duration to add, positive for a dit or dah, negative for a space
   */
  addTiming(duration: number) {
    if (duration === 0) {
      return;
    }
    if (this.unusedTimes.length > 0) {
      const last = this.unusedTimes[this.unusedTimes.length - 1];
      if (duration * last > 0) {
        // if the sign of the duration is the same as the previous one then add it on
        this.unusedTimes.pop();
        duration = last + duration;
      } else if (Math.abs(duration) <= this.noiseThreshold) {
        // if the duration is very short, assume it is a mistake and add it to the previous one
        this.unusedTimes.pop();
        duration = last - duration; // take care of the sign change
      }
    }

    this.unusedTimes.push(duration);

    // If we have just received a character space or longer then flush the timings
    if (-duration >= this._ditDahThreshold) {
      // TODO: if fwpm != wpm then the ditDahThreshold only applies to sound, not spaces so this is slightly wrong (need another threshold)
      this.flush();
    }
  }

  /**
   * Process the buffer of unused timings, converting them into Morse and converting the generated Morse into a message.
   * Should be called only when a character space has been reached (or the message is at an end).
   * Will call the messageCallback with the latest timings, morse (dots and dashes) and message.
   */
  flush() {
    // Then we've reached the end of a character or word or a flush has been forced

    // If the last character decoded was a space then just ignore additional quiet
    if (this.message[this.message.length - 1] === ' ') {
      if (this.unusedTimes[0] < 0) {
        this.unusedTimes.shift();
      }
    }

    // Make sure there is (still) something to decode
    if (this.unusedTimes.length === 0) {
      return;
    }

    // If last element is quiet but it is not enough for a space character then pop it off and replace afterwards
    const last = this.unusedTimes[this.unusedTimes.length - 1];
    if (last < 0 && -last < this._dahSpaceThreshold) {
      this.unusedTimes.pop();
    }

    const u = this.unusedTimes;
    const m = this.timings2morse(this.unusedTimes);
    const t = this.morse2text(m);
    this.morse += m;
    this.message += t;
    if (last < 0) {
      this.unusedTimes = [last]; // put the space back on the end in case there is more quiet to come
    } else {
      this.unusedTimes = [];
    }
    this.messageCallback({
      timings: u,
      morse: m,
      message: t,
    });
  }

  /**
   * Convert from millisecond timings to dots and dashes.
   * @param times - array of millisecond timings, +ve numbers representing a signal, -ve representing a space.
   * @return the dots and dashes as a string.
   * @access private
   */
  timings2morse(times: number[]): string {
    let ditdah = '';
    for (let i = 0; i < times.length; i++) {
      ditdah = ditdah + this.classify(times[i]);
    }
    return ditdah;
  }

  /**
   * The element one duration stands for: a dot, a dash, or the separator that a
   * silence of that length makes ('' inside a letter, ' ' between letters, '/'
   * between words).
   * @param duration - +ve for a signal, -ve for a silence
   * @access private
   */
  classify(duration: number): string {
    if (duration > 0) {
      return duration < this._ditDahThreshold ? '.' : '-';
    }
    const d = -duration;
    if (d < this._ditDahThreshold) return '';
    if (d < this._dahSpaceThreshold) return ' ';
    return '/';
  }

  /**
   * The dots and dashes received since the last completed character: the letter
   * that is still being keyed. Reading it does not consume anything, so the
   * decoder can be asked for it between any two timings.
   */
  get pendingMorse(): string {
    return this.timings2morse(this.unusedTimes);
  }
}
