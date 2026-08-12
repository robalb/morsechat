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

/**
 * The settings are the api's own type: what the state holds is exactly what
 * update_settings sends and what sess_init returns, so they are declared once,
 * with the rest of the schema, and re-exported here for the components that
 * read them from the state.
 */
export type { Keybinds, KeyMode, Settings } from '$lib/api/types';
import type { Settings } from '$lib/api/types';

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
  /** the countries those users came from, as ISO 3166-1 alpha-2 codes. The
   * popup counts them for its phrase and paints them on its map, so the list
   * is the only thing the endpoint has to send. */
  met_countries: string[];
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
  /** true until sess_init has answered; only ever cleared */
  loading: boolean;
  /** the error code sess_init failed with, empty when it did not */
  error: string;
  /** the `details` string that came with it, often empty */
  errorDetails: string;
}

/** the page that the auth dialog is showing. An empty string closes it. */
export type AuthPage = '' | 'menu' | 'login' | 'register' | 'verify';
