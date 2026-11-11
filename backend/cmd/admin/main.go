package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"strings"

	_ "github.com/mattn/go-sqlite3"
	"github.com/robalb/morsechat/internal/db"
)

/*
Admin bootstrap command.

Admins are stored in the database (users.is_admin) and are never configured
through environment variables: a mistyped or leaked env var must not be able to
grant administrative rights to an account.

Usage:

	go run cmd/admin/main.go -username <username>
	go run cmd/admin/main.go -username <username> -revoke

The database path defaults to SQLITE_PATH, then to db.sqlite, matching the
server configuration.
*/
func main() {
	defaultPath := os.Getenv("SQLITE_PATH")
	if defaultPath == "" {
		defaultPath = "db.sqlite"
	}

	fs := flag.NewFlagSet("admin", flag.ExitOnError)
	sqlitePath := fs.String("sqlite_path", defaultPath, "Path to the sqlite database")
	username := fs.String("username", "", "Username of the account to promote or demote")
	revoke := fs.Bool("revoke", false, "Remove admin rights instead of granting them")
	_ = fs.Parse(os.Args[1:])

	name := strings.TrimSpace(*username)
	if name == "" {
		fmt.Fprintln(os.Stderr, "admin: -username is required")
		fs.Usage()
		os.Exit(2)
	}

	ctx := context.Background()
	conn, err := db.NewWritePool(*sqlitePath, ctx)
	if err != nil {
		fmt.Fprintf(os.Stderr, "admin: could not open database: %v\n", err)
		os.Exit(1)
	}
	defer conn.Close()

	if err := db.ApplyMigrations(conn, ctx); err != nil {
		fmt.Fprintf(os.Stderr, "admin: could not apply migrations: %v\n", err)
		os.Exit(1)
	}

	queries := db.New(conn)
	isAdmin := int64(1)
	if *revoke {
		isAdmin = 0
	}

	result, err := queries.SetAdmin(ctx, db.SetAdminParams{
		IsAdmin:  isAdmin,
		Username: name,
	})
	if err != nil {
		fmt.Fprintf(os.Stderr, "admin: could not update user: %v\n", err)
		os.Exit(1)
	}

	affected, err := result.RowsAffected()
	if err != nil {
		fmt.Fprintf(os.Stderr, "admin: could not verify update: %v\n", err)
		os.Exit(1)
	}
	if affected == 0 {
		fmt.Fprintf(os.Stderr, "admin: user %q not found\n", name)
		os.Exit(1)
	}

	if *revoke {
		fmt.Printf("Removed admin rights from %q\n", name)
		return
	}
	fmt.Printf("Granted admin rights to %q\n", name)
}
