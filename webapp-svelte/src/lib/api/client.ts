/**
 * Port of webapp/src/utils/apiResolver.js, plus one function per endpoint.
 *
 * `request()` is the react version, unchanged in behaviour: it never throws and
 * never rejects, and every failure — the network, the decoding, an error the
 * server sent — comes back as the same object. The only difference is that the
 * two outcomes are now a discriminated union instead of a bag with an optional
 * `error` key, so `if (!res.ok)` is what narrows the result and there is no way
 * to read `res.data` on a failed call.
 *
 * The endpoints below are the whole surface the app uses, one thin typed
 * function each. There is no thunk, no slice and no cache: they are async
 * functions, and the state module is what calls them.
 */
import type {
  ApiResult,
  AuthResponse,
  LoginRequest,
  OkResponse,
  RegisterRequest,
  Settings,
  UserInfoResponse,
  UserStatsResponse,
} from './types';

// This is a VITE env variable
// https://vitejs.dev/guide/env-and-mode.html
const IS_PRODUCTION = import.meta.env.PROD;

/** Api endpoint url */
export const baseApiUrl = IS_PRODUCTION
  ? '/api/v1/'
  : 'http://localhost:8080/api/v1/';

/** websocket url */
export const wsUrl = IS_PRODUCTION
  ? `wss://${window.location.host}/ws/init`
  : 'http://localhost:8080/ws/init';

/**
 * Internal request method.
 *
 * Any kind of error is handled internally: this function always resolves,
 * either to `{ok: true, data}` or to `{ok: false, error, details}`.
 *
 * The errors it can produce by itself are `network_error`, `server_error` and
 * `abort_error` (see ClientErrorCode); every other code comes from the server,
 * common ones being `Validation failed` and `invalid_credentials`.
 *
 * @param endpoint - the path under baseApiUrl, e.g. 'login'
 * @param data - the request body, serialized as json
 * @param csrf - the value of the X-Csrf-Magic header, when there is one
 * @param signal - an AbortSignal, to cancel the request
 */
export async function request<T>(
  endpoint: string,
  data: unknown = {},
  csrf: string | false = false,
  signal?: AbortSignal
): Promise<ApiResult<T>> {
  // prepare request headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (csrf) headers['X-Csrf-Magic'] = csrf;

  let response: Response;
  // attempt to make an api call
  try {
    response = await fetch(baseApiUrl + endpoint, {
      signal,
      method: 'POST',
      mode: 'cors', // no-cors, *cors, same-origin
      cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
      credentials: 'include', // include, *same-origin, omit
      headers,
      redirect: 'follow', // manual, *follow, error
      referrerPolicy: 'no-referrer',
      body: JSON.stringify(data),
    });
  } catch (e) {
    const err = e as Error;
    if (err.name === 'AbortError') {
      return { ok: false, error: 'abort_error', details: '' };
    }
    return { ok: false, error: 'network_error', details: err.message };
  }

  // attempt to decode the api response into an object
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    // handle responses with a status different from 200
    if (response.status !== 200) {
      return {
        ok: false,
        error: 'server_error',
        details: 'server returned status code: ' + response.status,
      };
    }
    return {
      ok: false,
      error: 'server_error',
      details: 'server status is 200, but json parse failed',
    };
  }

  // The error envelope of validation.RespondError. The react version tested
  // for the `error` key on the decoded body and ignored the status entirely;
  // this checks the status first, so a successful response that happens to
  // carry a field called `error` cannot be mistaken for a failure.
  if (!response.ok) {
    const envelope = body as { error?: string; details?: string } | null;
    return {
      ok: false,
      error: envelope?.error || 'server_error',
      details:
        envelope?.details ?? 'server returned status code: ' + response.status,
    };
  }

  return { ok: true, data: body as T };
}

/* ------------------------------------------------------------------ *
 * Endpoints
 * ------------------------------------------------------------------ */

/**
 * Opens the session. Called once, before anything is rendered.
 *
 * Returns the current session when the browser already holds a jwt cookie,
 * and otherwise sets an anonymous one and returns that — so the callsign in
 * the response is always the one the websocket will connect with.
 */
export function sessInit(signal?: AbortSignal) {
  return request<AuthResponse>('sess_init', {}, false, signal);
}

export function login(data: LoginRequest, signal?: AbortSignal) {
  return request<AuthResponse>('login', data, false, signal);
}

export function register(data: RegisterRequest, signal?: AbortSignal) {
  return request<AuthResponse>('register', data, false, signal);
}

/** Replaces the session with a fresh anonymous one, which is what it returns. */
export function logout(signal?: AbortSignal) {
  return request<AuthResponse>('logout', {}, false, signal);
}

/** Authenticated. The whole settings object is sent, not a patch. */
export function updateSettings(settings: Settings, signal?: AbortSignal) {
  return request<OkResponse>('update_settings', settings, false, signal);
}

/** `already_taken` when the call sign exists, `invalid_callsign` when it is
 * not a well formed one. */
export function validateCallsign(callsign: string, signal?: AbortSignal) {
  return request<OkResponse>('validate_callsign', { callsign }, false, signal);
}

export function userInfo(username: string, signal?: AbortSignal) {
  return request<UserInfoResponse>('user/info', { Username: username }, false, signal);
}

/* ------------------------------------------------------------------ *
 * user/stats — stubbed
 *
 * The one endpoint here with no handler behind it: the popup that
 * shows these statistics is new in the svelte app, and the backend has
 * nothing that counts who has met whom yet.
 *
 * It is still written as an endpoint, with the same signature and the
 * same result type as the rest, so the popup is already written
 * against the api: when the handler lands, the body of the function
 * below becomes the one commented line inside it and nothing else in
 * the app changes.
 * ------------------------------------------------------------------ */

/** what every profile reports, until the server counts it for real */
const STUB_STATS = {
  joined: '2024-11-02',
  met_users: 412,
  met_countries: [
    'GB', 'IE', 'FR', 'DE', 'NL', 'BE', 'ES', 'PT', 'IT', 'CH', 'AT', 'PL',
    'CZ', 'SE', 'NO', 'FI', 'DK', 'GR', 'RO', 'UA', 'RU', 'TR', 'US', 'CA',
    'MX', 'BR', 'AR', 'CL', 'ZA', 'MA', 'EG', 'IN', 'JP', 'AU', 'NZ', 'ID',
    'CN',
  ],
};

/**
 * The public profile of a call sign: when the account joined, how many users
 * it has met and where they were from.
 *
 * STUBBED: there is no user/stats handler. Every call sign is answered with
 * the same numbers, after a short wait — the wait is deliberate, so that the
 * popup is written against a request that takes time rather than against a
 * value it can read synchronously.
 *
 * `username` comes back empty: the counts are invented, but a name is a fact
 * about an account, and inventing one would put a wrong name on screen. The
 * popup falls back to the name it already knows.
 */
export async function userStats(
  callsign: string,
  signal?: AbortSignal
): Promise<ApiResult<UserStatsResponse>> {
  // return request<UserStatsResponse>('user/stats', { callsign }, false, signal);

  await new Promise((resolve) => setTimeout(resolve, 150));
  if (signal?.aborted) {
    return { ok: false, error: 'abort_error', details: '' };
  }
  return {
    ok: true,
    data: { callsign, username: '', ...STUB_STATS },
  };
}
