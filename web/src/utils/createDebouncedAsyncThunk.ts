/**
 * https://gist.github.com/krstffr/245fe83885b597aabaf06348220c2fe9
 * https://gist.github.com/sarakusha/bb63f1a4a0143afc257eca57f2acc5f2
 */

import { createAsyncThunk, AsyncThunkPayloadCreator, AsyncThunk } from '@reduxjs/toolkit';

type DebounceSettings = {
  /**
   * The maximum time `payloadCreator` is allowed to be delayed before
   * it's invoked.
   * @defaultValue `0`
   */
  maxWait?: number;
  /**
   * Specify invoking on the leading edge of the timeout.
   * @defaultValue `false`
   */
  leading?: boolean;
};
/**
 * A debounced analogue of the `createAsyncThunk` from `@reduxjs/toolkit`
 * @param typePrefix - a string action type value
 * @param payloadCreator - a callback function that should return a promise containing the result
 *   of some asynchronous logic
 * @param wait - the number of milliseconds to delay.
 * @param options - the options object
 */
const createDebouncedAsyncThunk = <Returned, ThunkArg = void>(
  typePrefix: string,
  payloadCreator: AsyncThunkPayloadCreator<Returned, ThunkArg>,
  wait,
  options?: DebounceSettings
  // eslint-disable-next-line @typescript-eslint/ban-types
): AsyncThunk<Returned, ThunkArg, {}> => {
  const { maxWait = 0, leading = false } = options ?? {};
  let timer = 0;
  let maxTimer = 0;
  let resolve: ((value: boolean) => void) | undefined;
  const invoke = (): void => {
    window.clearTimeout(maxTimer);
    maxTimer = 0;
    if (resolve) {
      resolve(true);
      resolve = undefined;
    }
  };
  const cancel = (): void => {
    if (resolve) {
      resolve(false);
      resolve = undefined;
    }
  };
  return createAsyncThunk<Returned, ThunkArg>(typePrefix, payloadCreator as never, {
    condition() {
      const immediate = leading && !timer;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        invoke();
        timer = 0;
      }, wait);
      if (immediate) return true;
      cancel();
      if (maxWait && !maxTimer) maxTimer = window.setTimeout(invoke, maxWait);
      return new Promise<boolean>(res => {
        resolve = res;
      });
    },
  });
};

export default createDebouncedAsyncThunk;