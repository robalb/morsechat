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
  username, password, callsign, registration_session
) VALUES (
  ?, ?, ?, ?
);

/* name: DeleteUser :exec */
DELETE FROM users
WHERE username = ?;


/* name: CreateReport :execresult */
INSERT INTO report_action (
  reporter_user_id,
  reporter_session,
  baduser_session,
  badmessage_transcript,
  badmessage_recording
) VALUES (
  ?, ?, ?, ?, ?
);
