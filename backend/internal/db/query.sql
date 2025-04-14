/* name: GetUser :one */
SELECT * FROM users
WHERE username = ? LIMIT 1;

/* name: GetUserFromId :one */
SELECT * FROM users
WHERE id = ? LIMIT 1;

/* name: ListModerators :many */
SELECT * FROM users
WHERE is_moderator == 1;

/* name: CreateUser :execresult */
INSERT INTO users (
  username, password, callsign, country, registration_session
) VALUES (
  ?, ?, ?, ?, ?
);

/* name: CreateAnonUser :execresult */
INSERT INTO anon_users (
  last_session, is_banned
) VALUES (
  ?, ?
)
ON CONFLICT(last_session)
DO UPDATE SET is_banned = excluded.is_banned;

/* name: DeleteUser :exec */
DELETE FROM users
WHERE username = ?;

/* name: GetCallsign :one */
SELECT callsign FROM users
WHERE callsign = ? LIMIT 1;

/* name: CreateReport :execresult */
INSERT INTO report_action (
  reporter_user_id,
  reporter_username,
  reporter_session,
  baduser_id,
  baduser_username,
  baduser_session,
  badmessage_transcript,
  badmessage_timestamp
) VALUES (
  ?, ?, ?, ?, ?, ?, ?, ?
);

/* name: RecordBanAction :execresult */
INSERT INTO ban_action (
  moderator_id,
  moderator_username,
  baduser_id,
  baduser_username,
  baduser_session,
  moderator_notes,
  reason,
  is_ban_revert
) SELECT
  ?,      -- moderator_id
  ?,      -- moderator_username
  ?,      -- baduser_id
  COALESCE((SELECT username FROM users WHERE users.id = ?), ''), -- baduser_id
  ?,      -- baduser_session
  ?,      -- moderator_notes
  ?,      -- reason
  ?       -- is_ban_revert
;

/* name: GetLastBanEvents :many */
SELECT *
FROM ban_action
ORDER BY event_timestamp DESC
LIMIT 100;

/* name: GetLastReports :many */
SELECT *
FROM report_action
WHERE reporter_username LIKE ?
OR reporter_session LIKE ?
OR baduser_username LIKE ?
or baduser_SESSION LIKE ?
ORDER BY event_timestamp DESC
LIMIT 100;

/* name: GetLastBanned :many */
SELECT *
FROM users
WHERE is_banned == 1
AND username LIKE ?
LIMIT 100;

/* name: GetLastBannedAnon :many */
SELECT *
FROM anon_users
where is_banned == 1
AND last_session LIKE ?
LIMIT 100;

/* name: IsModerator :one */
SELECT is_moderator
FROM users
WHERE id == ?
LIMIT 1;

/* name: UpdateSettings :execresult */
UPDATE users SET settings = ? WHERE id = ?;

/* name: UpdateBanned :execresult */
UPDATE users SET is_banned = ? WHERE id = ?;

