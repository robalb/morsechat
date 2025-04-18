-- database conventions:
--
-- all tables in the schema are identified by a row ID,
-- see https://sqlite.org/lang_createtable.html#rowid
-- all join and foreign key references are based on the row ID,
-- which is a first class citizen in SQLITE, almost twice as fast
-- as a regular index lookup.
-- 
-- when storing an user.id as foreign key, it's convention to also 
-- store the user.username, to add a human readable information and
-- avoid extra lookups. The username will not be used as foreign key
-- This convention is also used in application-level data structures.
-- 
-- A Session, or DeviceId, is a string that uniquely
-- identifies a browsing session on our website.
-- a session is tied to a speicific timeline, and
-- browsing metadata like the user ip.
-- Everywhere auditing features are required, we log
-- sessions. Even when we have an username.
-- "session" is an alias for "device id".

CREATE TABLE IF NOT EXISTS users (
  id                     INTEGER PRIMARY KEY,
  username               TEXT NOT NULL,
  password               TEXT NOT NULL,
  callsign               TEXT NOT NULL,
  country                TEXT NOT NULL DEFAULT "US", -- ISO 3166-1 alpha-2 format
  settings               TEXT NOT NULL DEFAULT "",   -- JSON
  is_banned              INTEGER NOT NULL DEFAULT 0, -- BOOLEAN
  is_verified            INTEGER NOT NULL DEFAULT 0, -- BOOLEAN
  is_moderator           INTEGER NOT NULL DEFAULT 0, -- BOOLEAN
  registration_session   TEXT NOT NULL,    -- UUIDv4
  registration_timestamp INTEGER NOT NULL DEFAULT (unixepoch()),
  last_online_timestamp  INTEGER NOT NULL DEFAULT (unixepoch())
) STRICT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username
  ON users (username);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_callsign
  ON users (callsign);
CREATE INDEX IF NOT EXISTS idx_users_registration_session
  ON users (registration_session);


-- we keep track of anon_users only when we ban them,
-- in order to have a clear record of the existing
-- banned users, logged or not
CREATE TABLE IF NOT EXISTS anon_users (
  id                     INTEGER PRIMARY KEY,
  last_session           TEXT NOT NULL,
  is_banned              INTEGER NOT NULL DEFAULT 0 -- BOOLEAN
  ) STRICT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_anon_users_last_session
  ON anon_users (last_session);


CREATE TABLE IF NOT EXISTS report_action(
  id                     INTEGER PRIMARY KEY,
  reporter_user_id       INTEGER REFERENCES users(id),
  reporter_username      TEXT NOT NULL,
  reporter_session       TEXT NOT NULL,
  event_timestamp        INTEGER NOT NULL DEFAULT (unixepoch()),
  baduser_id             INTEGER REFERENCES users(id),
  baduser_username       TEXT NOT NULL,
  baduser_session        TEXT NOT NULL,
  reason                 TEXT NOT NULL DEFAULT "",
  badmessage_transcript  TEXT NOT NULL,
  badmessage_timestamp   INTEGER NOT NULL DEFAULT (unixepoch())
) STRICT;
-- lookup by ID is unlikey to happen; most report_action lookups will happen during
-- moderation queries, which are human based, and therefore based on the username
-- CREATE INDEX IF NOT EXISTS idx_report_action_reporter_user_id
--   ON report_action (reporter_user_id);
CREATE INDEX IF NOT EXISTS idx_report_action_reporter_username
  ON report_action (reporter_username);
CREATE INDEX IF NOT EXISTS idx_report_action_reporter_session
  ON report_action (reporter_session);
-- CREATE INDEX IF NOT EXISTS idx_report_action_baduser_id
--   ON report_action (baduser_id);
CREATE INDEX IF NOT EXISTS idx_report_action_baduser_username
  ON report_action (baduser_username);
CREATE INDEX IF NOT EXISTS idx_report_action_baduser_session
  ON report_action (baduser_session);
CREATE INDEX IF NOT EXISTS idx_report_action_event_timestamp
  ON report_action (event_timestamp);


CREATE TABLE IF NOT EXISTS ban_action(
  id                  INTEGER PRIMARY KEY,
  moderator_id        INTEGER NOT NULL REFERENCES USERS(id),
  moderator_username  TEXT NOT NULL,
  event_timestamp     INTEGER NOT NULL DEFAULT (unixepoch()),
  baduser_id          INTEGER REFERENCES USERS(id),
  baduser_username    TEXT NOT NULL,
  baduser_session     TEXT NOT NULL,
  moderator_notes     TEXT NOT NULL DEFAULT "",
  reason              TEXT NOT NULL DEFAULT "",
  is_ban_revert       INTEGER NOT NULL DEFAULT 0
) STRICT;
-- lookup by ID is unlikey to happen; most ban_action lookups will happen during
-- moderation queries, which are human based, and therefore based on the username
-- CREATE INDEX IF NOT EXISTS idx_ban_action_moderator_id
--   ON ban_action (moderator_id);
CREATE INDEX IF NOT EXISTS idx_ban_action_moderator_username
  ON ban_action (moderator_username);
-- CREATE INDEX IF NOT EXISTS idx_ban_action_baduser_id
--   ON ban_action (baduser_id);
CREATE INDEX IF NOT EXISTS idx_ban_action_baduser_username
  ON ban_action (baduser_username);
CREATE INDEX IF NOT EXISTS idx_ban_action_baduser_session
  ON ban_action (baduser_session);
CREATE INDEX IF NOT EXISTS idx_ban_action_event_timestamp
  ON ban_action (event_timestamp);



-- Experimental section


-- CREATE TABLE IF NOT EXISTS deviceid_identities(
--   id                  INTEGER PRIMARY KEY,
--   identityName        TEXT NOT NULL,
--   is_banned           INTEGER NOT NULL DEFAULT 0
-- ) STRICT;

-- CREATE TABLE IF NOT EXISTS deviceid_devices(
--   id                  INTEGER PRIMARY KEY,
--   device_id           TEXT NOT NULL,
--   ipv4                TEXT NOT NULL,
--   is_banned           INTEGER NOT NULL DEFAULT 0
-- ) STRICT;

-- CREATE TABLE IF NOT EXISTS deviceid_device_identity_map(
--   device_id       INTEGER NOT NULL,
--   identity_id     INTEGER NOT NULL,
--   PRIMARY KEY (device_id, identity_id),
--   FOREIGN KEY (device_id) REFERENCES deviceid_devices(id) ON DELETE CASCADE,
--   FOREIGN KEY (identity_id) REFERENCES deviceid_identities(id) ON DELETE CASCADE
-- ) STRICT;
