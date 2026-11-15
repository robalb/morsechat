import * as rest from '$lib/api/client';
import type {
  ApiResult,
  AuthResponse,
  KeyMode,
  Keybinds,
  LoginRequest,
  RegisterRequest,
  Settings,
} from '$lib/api/types';
import { enqueueSnackbar } from '$lib/components/snackbar/snackbar.svelte';
import { frequencyFromCallsign } from '$lib/sound/audio';

import type { ApiState, UserState } from './types';

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
    straight: ['space', 'c'],
    yambic_left: ['z'],
    yambic_right: ['x'],
    transmit: ['w'],
    cancel_message: ['p'],
  },
};

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
  // the keybinds are copied a level deeper than the rest: each action holds a
  // list, and the panel edits those lists in place
  settings: { ...initialSettings, keybinds: normalizeKeybinds(initialSettings.keybinds) },
});

/**
 * The keybinds of a settings object, as this app wants them: one list of keys
 * per action, and all five actions present.
 *
 * What comes back from the server is not necessarily that. Every account saved
 * before the panel could edit them holds the old shape — one string per action,
 * and no `transmit` at all — and a bare string where a list is expected reads as
 * a list of its characters, which would bind `c` to nothing and `space` to five
 * unrelated letters. So a string is widened to the one key it is, and a missing
 * action falls back to its default rather than to nothing: an action with no
 * keys cannot be triggered, and the popup will not let you save one either.
 */
function normalizeKeybinds(stored: Partial<Keybinds> | undefined): Keybinds {
  const keys = (value: unknown, fallback: string[]): string[] => {
    if (typeof value === 'string') return value ? [value] : [...fallback];
    if (Array.isArray(value) && value.length > 0) return value.map(String);
    return [...fallback];
  };
  const defaults = initialSettings.keybinds;
  return {
    straight: keys(stored?.straight, defaults.straight),
    yambic_left: keys(stored?.yambic_left, defaults.yambic_left),
    yambic_right: keys(stored?.yambic_right, defaults.yambic_right),
    transmit: keys(stored?.transmit, defaults.transmit),
    cancel_message: keys(stored?.cancel_message, defaults.cancel_message),
  };
}

/**
 * Maps the free-form `key_mode` of the wire to a mode this app still has:
 * accounts saved while `straight_dynamic` existed still send it back.
 *
 * @param stored - the value the server returned
 * @returns the mode to use, straight for anything unknown
 */
function normalizeKeyMode(stored: string | undefined): KeyMode {
  return stored === 'yambic' ? 'yambic' : 'straight';
}

function applyAuthResponse(res: AuthResponse) {
  user.authenticated = !res.is_anonymous;
  user.callsign = res.callsign;
  user.country = res.country;
  user.isadmin = res.is_admin;
  user.ismoderator = res.is_moderator;
  user.username = res.username || null;
  if (res.settings) {
    user.settings = {
      ...res.settings,
      key_mode: normalizeKeyMode(res.settings.key_mode),
      keybinds: normalizeKeybinds(res.settings.keybinds),
    };
  }

  if (!res.settings || res.settings.key_frequency === 0) {
    user.settings.key_frequency = frequencyFromCallsign(res.callsign);
  }

  // whatever the server just sent is by definition what the server holds
  markSettingsSaved();
}

/* ------------------------------------------------------------------ *
 * Session
 * ------------------------------------------------------------------ */

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

export async function retrySession(): Promise<ApiResult<AuthResponse>> {
  const res = await initSession();
  if (!res.ok) {
    enqueueSnackbar('Loading failed again', {
      variant: 'error',
      preventDuplicate: true,
    });
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
