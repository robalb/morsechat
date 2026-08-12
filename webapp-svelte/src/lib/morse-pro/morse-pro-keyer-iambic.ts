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
MODIFICATIONS (morsechat): converted from javascript to typescript, options
object instead of positional arguments (see ./morse-pro-keyer.ts, whose
constructor this one passes through to). The state machine is unchanged.
*/

import MorseKeyer from './morse-pro-keyer';
import type { MorseKeyerOptions } from './morse-pro-keyer';

export interface MorseIambicKeyerOptions extends MorseKeyerOptions {
  /**
   * if true then use iambic A mode, otherwise use iambic B mode (which sends an
   * additional dit or dah when squeeze is released).
   */
  iambicA?: boolean;
}

/*
    The Morse iambic keyer tests for input on a timer, plays the appropriate tone and passes the data to a decoder.
    If both keys are detected at once then this class alternates between dit and dah.
    If iambic B mode is selected then if both keys were pressed and are then release, an additional dit or dah is sent.
    Set 'ditGoesFirst' to define whether to play dit or dah first.
    Arguments: see MorseKeyer
*/
export default class MorseIambicKeyer extends MorseKeyer {
  /** if the initial signal is 3 then alternate but play a dit first */
  ditGoesFirst = true;
  iambicA: boolean;

  private _lastDitOrDah: boolean | undefined = undefined;
  private _lastInput: number | undefined = undefined;

  constructor(options: MorseIambicKeyerOptions) {
    super(options);
    this.iambicA = options.iambicA ?? true;
  }

  /**
   * @override
   * @access private
   */
  protected _ditOrDah(input: number): boolean | undefined {
    let ditOrDah: boolean | undefined = undefined;
    switch (input) {
      case 0:
        if (!this.iambicA) {
          // iambic B mode
          if (this._lastInput === 3) {
            // gone from both to nothing
            // once paddles are released, send one more dit or dah
            ditOrDah = !this._lastDitOrDah;
          }
        }
        break;
      case 1:
        ditOrDah = true;
        break;
      case 2:
        ditOrDah = false;
        break;
      case 3:
        if (this._lastDitOrDah === undefined) {
          ditOrDah = this.ditGoesFirst;
        } else {
          ditOrDah = !this._lastDitOrDah;
        }
    }
    this._lastDitOrDah = ditOrDah;
    this._lastInput = input;
    return ditOrDah;
  }
}
