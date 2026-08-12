/**
 * The shape of the application state.
 *
 * These are the three redux slices of the react app (api, user, chat),
 * transcribed as plain types. Nothing here is wired to the backend yet: this
 * migration step ports the layout only. When the real state lands, these types
 * are what the stores should satisfy, so the components below do not change.
 *
 * Reference: webapp/src/redux/{apiSlice,userSlice,chatSlice}.js
 */

export interface Keybinds {
  straight: string;
  yambic_left: string;
  yambic_right: string;
  cancel_message: string;
}

export type KeyMode = 'straight' | 'yambic';

export interface Settings {
  /** 5-50 */
  wpm: number;
  key_frequency: number;
  /** 0-100 */
  volume_receiver: number;
  /** 0-100 */
  volume_key: number;
  dialect: string;
  key_mode: KeyMode;
  show_readable: boolean;
  left_is_dot: boolean;
  /** 5-50 */
  submit_delay: number;
  keybinds: Keybinds;
}

export interface UserState {
  authenticated: boolean | null;
  isadmin: boolean;
  ismoderator: boolean;
  callsign: string | null;
  country: string | null;
  settings: Settings;
  id: number | null;
  username: string | null;
  show_popup: boolean;
}

export interface Channel {
  ch: string;
  name: string;
}

export interface OnlineUser {
  is_anonymous: boolean;
  typing: boolean;
  allowSound: boolean;
  /** empty when the user is anonymous */
  username: string;
  /** acts as the identifier of the user */
  callsign: string;
}

/**
 * The public profile of a registered user, shown by the user popup.
 *
 * New in the svelte app: the react version's popup only ever showed a callsign
 * and a username. The backend has no endpoint for this yet, so the shape is
 * what the popup needs, and `placeholderProfiles` below stands in for it.
 */
export interface UserProfile {
  /** acts as the identifier of the user, as everywhere else */
  callsign: string;
  username: string;
  /** ISO date, the day the account was created */
  joined: string;
  /** how many distinct users this one has shared a channel with */
  met_users: number;
  /** how many distinct countries those users came from */
  met_countries: number;
  /** 'YYYY-MM-DD' -> number of transmissions sent that day (UTC) */
  activity: Record<string, number>;
}

export type ConnectionStatus =
  | 'powering on'
  | 'connecting'
  | 'connected'
  | 'connection denied'
  | 'connection busy'
  | 'connection failed';

export interface ChatState {
  channel: string;
  channels: Channel[];
  connected: boolean;
  connectionStatus: ConnectionStatus;
  onlineUsers: Record<string, OnlineUser>;
  myID: string | null;
  /** alternating key-down / key-up durations in ms */
  messageBuffer: number[];
  keyDown: boolean;
}

export interface ApiState {
  loading: boolean;
  error: string;
}

/** the page that the auth dialog is showing. An empty string closes it. */
export type AuthPage = '' | 'menu' | 'login' | 'register' | 'verify';
