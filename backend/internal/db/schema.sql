
-- A session is an UUIDv4 that uniquely
-- identifies a browsing session on our website.
-- a session is tied to a speicific timeline, and
-- browsing metadata like the user ip.
-- Everywhere auditing features are required, we log
-- session ids. Even when we have an username.

CREATE TABLE IF NOT EXISTS users (
  id                     INTEGER PRIMARY KEY,
  username               TEXT NOT NULL,
  callsign               TEXT NOT NULL,
  settings               TEXT NOT NULL DEFAULT "",
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
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_registration_session
  ON users (registration_session);


CREATE TABLE IF NOT EXISTS report_action(
  id                     INTEGER PRIMARY KEY,
  reporter_user_id       INTEGER NOT NULL REFERENCES users(id),
  reporter_session       TEXT NOT NULL,
  event_timestamp        INTEGER NOT NULL DEFAULT (unixepoch()),
  baduser_id             INTEGER REFERENCES users(id),
  baduser_session        TEXT NOT NULL,
  reason                 TEXT NOT NULL DEFAULT "",
  badmessage_transcript  TEXT NOT NULL,
  badmessage_recording   TEXT NOT NULL
) STRICT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_report_action_reporter_user_id
  ON report_action (reporter_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_report_action_reporter_session
  ON report_action (reporter_session);
CREATE UNIQUE INDEX IF NOT EXISTS idx_report_action_baduser_id
  ON report_action (baduser_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_report_action_baduser_session
  ON report_action (baduser_session);



CREATE TABLE IF NOT EXISTS ban_action(
  id               INTEGER PRIMARY KEY,
  moderator_id     INTEGER NOT NULL REFERENCES USERS(id)
  event_timestamp  INTEGER NOT NULL DEFAULT (unixepoch()),
  baduser_id       INTEGER REFERENCES USERS(id)
  baduser_session  TEXT NOT NULL
  moderator_notes  TEXT NOT NULL DEFAULT "",
  reason           TEXT NOT NULL DEFAULT "",
  is_ban_revert    INTEGER NOT NULL DEFAULT 0
) STRICT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_ban_action_moderator_id
  ON ban_action (moderator_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ban_action_baduser_id
  ON ban_action (baduser_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ban_action_baduser_session
  ON ban_action (baduser_session);

