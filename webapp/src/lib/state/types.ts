/**
 * The settings are the api's own type: what the state holds is exactly what
 * update_settings sends and what sess_init returns, so they are declared once,
 * with the rest of the schema, and re-exported here for the components that
 * read them from the state.
 */
export type { Keybinds, KeyMode, Settings } from '$lib/api/types';
import type { Settings } from '$lib/api/types';

/** likewise the connection states: they are the socket's own, re-exported for
 * the components that read them off the state */
export type { SocketState } from '$lib/socket/types';
import type { SocketState } from '$lib/socket/types';

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
 * The public profile of a registered user, shown by the user popup. The
 * response of the (still stubbed) user/stats endpoint, under the name the
 * components know it by.
 */
export type { UserStatsResponse as UserProfile } from '$lib/api/types';

/**
 * What the status pill says.
 *
 * Two things end up in the same field: the state of the socket itself, which
 * the client reports as it transitions, and the three ways a channel can turn
 * a connected socket away. The pill prints whichever it holds verbatim, which
 * is why the wordings are the state.
 */
export type ConnectionStatus =
  | SocketState
  /** the state before the socket exists — nothing has been attempted yet */
  | 'powering on'
  /** a pro channel, anonymously */
  | 'connection denied'
  /** the channel, the ip or the device is over its cap */
  | 'connection busy'
  /** the join was refused for any other reason */
  | 'connection failed';

export interface ChatState {
  channel: string;
  channels: Channel[];
  connected: boolean;
  connectionStatus: ConnectionStatus;
  onlineUsers: Record<string, OnlineUser>;
  myID: string | null;
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
