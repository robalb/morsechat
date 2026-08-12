/**
 * The session: who the user is, and their settings.
 *
 * This is the api-backed replacement for the `user` and `api` objects of
 * placeholder.svelte.ts, and it is what the react app spread across
 * redux/apiSlice.js, redux/userSlice.js, utils/createDebouncedAsyncThunk.ts and
 * hooks/useStateDep.ts.
 *
 * There is no store, no slice, no thunk and no dispatch: the state is two
 * `$state` objects that components already read, and the endpoints are async
 * functions that write into them. A component calls `login()` and awaits its
 * result the way it would any other async function, and the result it gets is
 * the same union every api call returns, so the error handling of the react
 * components ports across unchanged.
 *
 * The websocket, the chat and the sound engine are still placeholder state:
 * this step is the rest api only.
 */
import * as rest from '$lib/api/client';
import type {
  ApiResult,
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  Settings,
} from '$lib/api/types';
import { enqueueSnackbar } from '$lib/components/snackbar/snackbar.svelte';

import type { ApiState, UserState } from './types';

/** The settings a session starts with, from userSlice.js's initialSettings. A
 * registered account overwrites them with what sess_init or login returns. */
const initialSettings: Settings = {
  wpm: 12,
  key_frequency: 440,
  volume_receiver: 50,
  volume_key: 50,
  dialect: 'international',
  key_mode: 'straight',
  show_readable: true,
  left_is_dot: true,
  submit_delay: 12,
  keybinds: {
    straight: 'c',
    yambic_left: 'z',
    yambic_right: 'x',
    cancel_message: 'p',
  },
};

/**
 * The loading state of the initial session call, and the error it failed with.
 *
 * `loading` starts true and is only ever cleared, as in apiSlice.js: the app
 * renders its skeletons until sess_init has answered.
 */
export const api: ApiState = $state({
  loading: true,
  error: '',
  errorDetails: '',
});

export const user: UserState = $state({
  authenticated: null,
  isadmin: false,
  ismoderator: false,
  callsign: null,
  country: null,
  id: null,
  username: null,
  show_popup: false,
  settings: { ...initialSettings, keybinds: { ...initialSettings.keybinds } },
});

/**
 * Writes an auth response into the user state. login, register, logout and
 * sess_init all return the same object, and the four extraReducers of
 * userSlice.js did the same four things with it.
 */
function applyAuthResponse(res: AuthResponse) {
  user.authenticated = !res.is_anonymous;
  user.callsign = res.callsign;
  user.country = res.country;
  user.isadmin = res.is_admin;
  user.ismoderator = res.is_moderator;
  user.username = res.username || null;
  if (res.settings) user.settings = res.settings;

  // TODO: the react version also assigns a pseudorandom key frequency derived
  // from the callsign when the account has none saved (getFreqencyFromCallsign,
  // utils/ReceiverSound.js). That function is part of the sound engine, which
  // is not ported yet, so the default 440 stands until it is.

  // whatever the server just sent is by definition what the server holds
  markSettingsSaved();
}

/* ------------------------------------------------------------------ *
 * Session
 * ------------------------------------------------------------------ */

/**
 * Opens the session. Called once from main.ts, before the app is mounted,
 * exactly where pageRender.jsx dispatches fetchAllData().
 */
export async function initSession(): Promise<ApiResult<AuthResponse>> {
  const res = await rest.sessInit();
  if (res.ok) {
    applyAuthResponse(res.data);
    api.loading = false;
    api.error = '';
    api.errorDetails = '';
  } else {
    // the app stays in its loading state and shows the error with a retry,
    // which is what <MainDataLoading /> is
    api.error = res.error;
    api.errorDetails = res.details;
  }
  return res;
}

export async function login(data: LoginRequest): Promise<ApiResult<AuthResponse>> {
  const res = await rest.login(data);
  if (res.ok) applyAuthResponse(res.data);
  return res;
}

/**
 * Registers an account. The response logs the user in — the backend sets the
 * session cookie — but carries no settings, so the ones in the state stay as
 * they are.
 */
export async function register(
  data: RegisterRequest
): Promise<ApiResult<AuthResponse>> {
  const res = await rest.register(data);
  if (res.ok) applyAuthResponse(res.data);
  return res;
}

/** Drops the account and continues anonymously, with a new callsign. */
export async function logout(): Promise<ApiResult<AuthResponse>> {
  const res = await rest.logout();
  if (res.ok) applyAuthResponse(res.data);
  return res;
}

/* ------------------------------------------------------------------ *
 * Settings
 *
 * The controls bind straight to `user.settings`, so a change is already
 * applied locally by the time anything here notices — which is what the
 * react updateSettings() thunk did in its first line, before debouncing
 * the api call by four seconds.
 *
 * The debounce is the point: a slider drag is a hundred changes, and
 * update_settings takes the whole settings object, so only the last one
 * of a burst is worth sending. syncSettings() below is that debounce,
 * watching the state instead of being called from every control.
 * ------------------------------------------------------------------ */

/** createDebouncedAsyncThunk's delay in userSlice.js */
const SETTINGS_DEBOUNCE = 4000;

/** the settings as the server last accepted them, serialized for comparison */
let savedSettings = '';
let saveTimer: ReturnType<typeof setTimeout> | undefined;

function serializeSettings(): string {
  return JSON.stringify($state.snapshot(user.settings));
}

function markSettingsSaved() {
  savedSettings = serializeSettings();
}

async function pushSettings() {
  const pending = serializeSettings();
  const res = await rest.updateSettings($state.snapshot(user.settings));
  if (res.ok) {
    savedSettings = pending;
  } else {
    // The react version has this snackbar commented out, and swallows the
    // rejection instead. A setting that silently fails to persist is worth a
    // line: the user finds out at the next login otherwise.
    enqueueSnackbar(`your settings could not be saved: ${res.error}`, {
      variant: 'error',
      preventDuplicate: true,
    });
  }
}

/**
 * Starts the settings watcher. Called once, from the component that owns the
 * layout — it is an `$effect`, so it needs to belong to a component, and
 * unmounting that component is what stops it.
 */
export function syncSettings() {
  $effect(() => {
    // read what we depend on, so the effect re-runs on any of them
    const current = serializeSettings();
    const authenticated = user.authenticated;

    // nothing to save before the session is known, and nowhere to save it for
    // an anonymous user: their settings live in this tab and nowhere else
    if (api.loading || !authenticated) return;
    if (current === savedSettings) return;

    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      void pushSettings();
    }, SETTINGS_DEBOUNCE);

    return () => clearTimeout(saveTimer);
  });
}
