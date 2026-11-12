package db

import (
	"context"
	"database/sql"
	"fmt"
	"reflect"
	"testing"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

func TestConn(t *testing.T) {
	ctx := context.Background()
	ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
	t.Cleanup(cancel)

	db, err := NewTestConn(":memory:", ctx)
	if err != nil {
		t.Fatalf("error opening db: %v", err)
	}

	queries := New(db)

	// list all authors
	authors, err := queries.ListModerators(ctx)
	if err != nil {
		t.Fatalf("error query db: %v", err)
	}
	fmt.Println(authors)

	// create an author
	insertedUser, err := queries.CreateUser(ctx, CreateUserParams{
		Username:            "lorem",
		Callsign:            "US121X",
		Country:             "US",
		RegistrationSession: "afakeuuidv4",
	})
	if err != nil {
		t.Fatalf("error inserting into db")
	}

	id, err := insertedUser.LastInsertId()
	if err != nil {
		t.Fatalf("error getting inserted id ")
	}
	// get the author we just inserted
	fetchedUser, err := queries.GetUserFromId(ctx, id)
	if err != nil {
		t.Fatalf("error selecting data from db")
	}

	if !reflect.DeepEqual(fetchedUser.Username, "lorem") {
		t.Fatalf("error data mismatch, %v", fetchedUser)
	}
	if fetchedUser.IsBanned != 0 {
		t.Fatalf("error data mismatch, %v", fetchedUser)
	}
	if delta := time.Since(time.Unix(fetchedUser.RegistrationTimestamp, 0)); delta > 2*time.Second {
		t.Fatalf("error timing in basic query, %v", delta)
	}

}

// TestApplyMigrationsAddsIsAdminColumn reproduces a database created before
// the is_admin column existed, and verifies that ApplyMigrations upgrades it
// in place without losing data.
func TestApplyMigrationsAddsIsAdminColumn(t *testing.T) {
	ctx := context.Background()
	ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
	t.Cleanup(cancel)

	conn, err := sql.Open("sqlite3", ":memory:")
	if err != nil {
		t.Fatalf("error opening db: %v", err)
	}
	t.Cleanup(func() { conn.Close() })
	// :memory: databases are per-connection, so keep a single connection.
	conn.SetMaxOpenConns(1)

	// The old schema, deliberately without is_admin.
	_, err = conn.ExecContext(ctx, `
		CREATE TABLE users (
			id                     INTEGER PRIMARY KEY,
			username               TEXT NOT NULL,
			password               TEXT NOT NULL,
			callsign               TEXT NOT NULL,
			country                TEXT NOT NULL DEFAULT "US",
			settings               TEXT NOT NULL DEFAULT "",
			is_banned              INTEGER NOT NULL DEFAULT 0,
			is_verified            INTEGER NOT NULL DEFAULT 0,
			is_moderator           INTEGER NOT NULL DEFAULT 0,
			registration_session   TEXT NOT NULL,
			registration_timestamp INTEGER NOT NULL DEFAULT (unixepoch()),
			last_online_timestamp  INTEGER NOT NULL DEFAULT (unixepoch())
		) STRICT;
		INSERT INTO users (username, password, callsign, registration_session)
		VALUES ('olduser', 'hash', 'US00OLD', 'old-session');
	`)
	if err != nil {
		t.Fatalf("error creating old schema: %v", err)
	}

	if err := ApplyMigrations(conn, ctx); err != nil {
		t.Fatalf("error applying migrations: %v", err)
	}

	// The column must exist, be usable, and the old row must still be there.
	queries := New(conn)
	isAdmin, err := queries.IsAdmin(ctx, 1)
	if err != nil {
		t.Fatalf("error querying migrated is_admin: %v", err)
	}
	if isAdmin != 0 {
		t.Fatalf("expected existing users to not be admins, got %d", isAdmin)
	}

	if _, err := queries.SetAdmin(ctx, SetAdminParams{IsAdmin: 1, Username: "olduser"}); err != nil {
		t.Fatalf("error setting admin on migrated database: %v", err)
	}
	isAdmin, err = queries.IsAdmin(ctx, 1)
	if err != nil {
		t.Fatalf("error querying is_admin after update: %v", err)
	}
	if isAdmin != 1 {
		t.Fatalf("expected user to be an admin after update, got %d", isAdmin)
	}
}
