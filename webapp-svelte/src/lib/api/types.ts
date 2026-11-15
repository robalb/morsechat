/**
 * The rest api schema, as typescript.
 *
 * This is a transcription of the go structs the backend serializes, and it is
 * the only place where the wire format is described:
 *
 *   backend/internal/handlers/apischema.go   Keybinds, Settings, AuthResponse, OkResponse
 *   backend/internal/handlers/auth.go        RegisterData, LoginData, CallsignData
 *   backend/internal/handlers/user.go        ServeUserInfo_req / _ok
 *   backend/internal/validation/response.go  the error envelope
 *
 * Field names are the json tags of those structs, so a request body is just the
 * object literal, with no mapping layer in between. When a go struct grows a
 * field, it grows here too and everything that reads it stops compiling.
 */

/* ------------------------------------------------------------------ *
 * Settings
 *
 * These are also the application's own settings type: the state holds
 * exactly what update_settings sends, which is why lib/state/types.ts
 * re-exports them from here rather than declaring its own.
 * ------------------------------------------------------------------ */

/**
 * The keys each action answers to, by the name the picker offers them under: a
 * letter, or `space` (lib/components/controls/keybindings.ts).
 *
 * The go struct matches this: five `[]string` fields, each holding 1 to 10 keys
 * of at most 5 characters — the length of `space`, the longest name the picker
 * offers. It used to declare one 1-2 character string per action and no
 * `transmit` at all, which is the shape settings saved by the react app still
 * hold: those no longer unmarshal, so the server answers such an account with
 * no settings and the client keeps its defaults.
 */
export interface Keybinds {
  straight: string[];
  yambic_left: string[];
  yambic_right: string[];
  /** sends the message in the preview without waiting for the countdown */
  transmit: string[];
  cancel_message: string[];
}

/** Free-form on the wire (`min=1,max=20`); these are the values used. */
export type KeyMode = 'straight' | 'yambic';

export interface Settings {
  /** 5-50 */
  wpm: number;
  /** 200-1000 */
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

/* ------------------------------------------------------------------ *
 * Responses
 * ------------------------------------------------------------------ */

/** The response of login, register, logout and sess_init alike. */
export interface AuthResponse {
  is_anonymous: boolean;
  is_admin: boolean;
  is_moderator: boolean;
  /** empty for an anonymous session */
  username: string;
  callsign: string;
  /** ISO 3166-1 alpha-2, lowercase */
  country: string;
  /** null when the account has never saved any: the client keeps its defaults */
  settings: Settings | null;
}

export interface OkResponse {
  ok: string;
}

/**
 * The public profile of a registered user, shown by the user popup.
 *
 * New in the svelte app: the react popup only ever showed a callsign and a
 * username. There is no handler for this yet — `userStats()` in client.ts
 * answers it with fixed numbers — so this is the shape the endpoint should
 * take rather than one read off a go struct. It is what the popup needs and
 * no more: the countries arrive as a list because the popup both counts them
 * for its sentence and paints them on its map.
 */
export interface UserStatsResponse {
  /** acts as the identifier of the user, as everywhere else */
  callsign: string;
  username: string;
  /** ISO date, the day the account was created */
  joined: string;
  /** how many distinct users this one has shared a channel with */
  met_users: number;
  /** the countries those users came from, as ISO 3166-1 alpha-2 codes */
  met_countries: string[];
}

/** user/info and user/me. That handler declares no json tags, so go
 * serializes the field names as they are written, capitalized. */
export interface UserInfoResponse {
  Username: string;
  Callsign: string;
  LastOnlineTimestamp: number;
  RegistrationTimestamp: number;
}

/* ------------------------------------------------------------------ *
 * Requests
 * ------------------------------------------------------------------ */

export interface LoginRequest {
  /** 3-20 characters */
  username: string;
  /** 8-255 characters */
  password: string;
}

export interface RegisterRequest extends LoginRequest {
  /** 4-10 characters, e.g. IU2ABC */
  callsign: string;
}

export interface ValidateCallsignRequest {
  callsign: string;
}

/* ------------------------------------------------------------------ *
 * Moderation
 *
 * backend/internal/handlers/apischema.go  ModerationListResponse
 * backend/internal/handlers/moderator.go  the requests
 * ------------------------------------------------------------------ */

export interface ModerationUser {
  id: number;
  username: string;
  callsign: string;
  country: string | null;
  is_verified: boolean;
  is_moderator: boolean;
}

/** A banned user with no account: the device is all that identifies it. */
export interface ModerationAnonUser {
  id: number;
  last_session: string;
}

export interface ModerationBanAction {
  id: number;
  moderator_id: number;
  moderator_username: string;
  /** unix seconds */
  event_timestamp: number;
  /** 0 when the banned user was anonymous */
  baduser_id: number;
  baduser_username: string;
  baduser_session: string;
  moderator_notes: string | null;
  reason: string | null;
  is_ban_revert: boolean;
}

export interface ModerationReportAction {
  id: number;
  /** 0 when the reporter was anonymous */
  reporter_user_id: number;
  reporter_username: string;
  reporter_session: string;
  /** unix seconds, when the report was filed */
  event_timestamp: number;
  /** 0 when the reported user was anonymous */
  baduser_id: number;
  baduser_username: string;
  baduser_session: string;
  reason: string | null;
  badmessage_transcript: string;
  /** unix seconds, when the reported message was sent */
  badmessage_timestamp: number;
}

export interface ModerationListResponse {
  users: ModerationUser[];
  anon_users: ModerationAnonUser[];
  ban_actions: ModerationBanAction[];
  report_actions: ModerationReportAction[];
}

/** A query shorter than 2 characters is answered with the most recent rows. */
export interface ModerationListRequest {
  query: string;
}

/**
 * At least one identifier is required. Sending both bans the account and the
 * device together, which is what the server recommends.
 */
export interface ModerationBanRequest {
  baduser_username: string;
  baduser_session: string;
  /** kept in the ban log */
  notes: string;
  is_revert: boolean;
}

/** The mute is applied by the websocket hub and leaves no db record. */
export interface ModerationMuteRequest {
  callsign: string;
  mute: boolean;
}

/** The signature is what the server reads the reported user out of. */
export interface ReportRequest {
  text: string;
  signature: string;
}

/* ------------------------------------------------------------------ *
 * Errors
 *
 * Every failing endpoint answers with the same two-field envelope,
 * `{error, details}`, under a non-200 status. `error` is a code the ui
 * can branch on; `details` is a developer-facing string that is often
 * empty.
 * ------------------------------------------------------------------ */

/**
 * The error codes this client can produce on its own, without the server
 * having said anything. Copied from the react apiResolver, which is where the
 * strings come from.
 *
 * - `network_error` the http request failed: cors, or the connection
 * - `server_error`  the server answered with something unexpected: invalid
 *                   json, or a status other than 200
 * - `abort_error`   the request was cancelled through its AbortSignal
 */
export type ClientErrorCode = 'network_error' | 'server_error' | 'abort_error';

/**
 * The codes the endpoints in use here return. Anything the backend adds still
 * arrives as a plain string, hence the `(string & {})` arm: the union
 * documents and autocompletes the known codes without making an unknown one a
 * type error at the point where it is read.
 */
export type ApiErrorCode =
  | ClientErrorCode
  /** the request body failed the go-playground/validator pass; `details`
   * carries the field report */
  | 'Validation failed'
  | 'invalid_credentials'
  | 'username_taken'
  | 'callsign_taken'
  | 'invalid_callsign'
  | 'already_taken'
  | 'Already logged in'
  | (string & {});

/**
 * The result of any api call. Nothing throws: a caller checks `ok` and gets
 * either the decoded response or a code it can branch on.
 */
export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiErrorCode; details: string };
