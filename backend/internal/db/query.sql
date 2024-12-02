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
  username, callsign, registration_session
) VALUES (
  ?, ?, ?
);

/* name: DeleteUser :exec */
DELETE FROM users
WHERE username = ?;
