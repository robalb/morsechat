package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"io"
	"os"
	"path/filepath"
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

	go run cmd/admin/main.go -username <username> -sqlite_path <database>
	SQLITE_PATH=<database> go run cmd/admin/main.go -username <username>
	go run cmd/admin/main.go -username <username> -revoke [same path options]

The database path must be configured explicitly, either with -sqlite_path or
with the SQLITE_PATH environment variable. The flag takes precedence, matching
the server configuration order.

The command never guesses a database path: silently opening a different file
would promote the wrong account, or create an empty database and report the
user as missing.
*/
func main() {
	os.Exit(run(os.Args[1:], os.Getenv, os.Stdout, os.Stderr))
}

func run(
	args []string,
	getenv func(string) string,
	stdout io.Writer,
	stderr io.Writer,
) int {
	fs := flag.NewFlagSet("admin", flag.ContinueOnError)
	fs.SetOutput(stderr)
	sqlitePath := fs.String("sqlite_path", "", "Path to the sqlite database (required unless SQLITE_PATH is set)")
	username := fs.String("username", "", "Username of the account to promote or demote")
	revoke := fs.Bool("revoke", false, "Remove admin rights instead of granting them")

	if err := fs.Parse(args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return 0
		}
		return 2
	}

	name := strings.TrimSpace(*username)
	if name == "" {
		fmt.Fprintln(stderr, "admin: -username is required")
		fs.Usage()
		return 2
	}

	dbPath, err := resolveSqlitePath(*sqlitePath, getenv)
	if err != nil {
		fmt.Fprintf(stderr, "admin: %v\n", err)
		fs.Usage()
		return 2
	}

	dbPath, err = filepath.Abs(dbPath)
	if err != nil {
		fmt.Fprintf(stderr, "admin: could not resolve database path %q: %v\n", dbPath, err)
		return 1
	}
	info, err := os.Stat(dbPath)
	if errors.Is(err, os.ErrNotExist) {
		fmt.Fprintf(stderr, "admin: database %q does not exist\n", dbPath)
		return 1
	}
	if err != nil {
		fmt.Fprintf(stderr, "admin: could not access database %q: %v\n", dbPath, err)
		return 1
	}
	if info.IsDir() {
		fmt.Fprintf(stderr, "admin: database path %q is a directory\n", dbPath)
		return 1
	}

	ctx := context.Background()
	conn, err := db.NewWritePool(dbPath, ctx)
	if err != nil {
		fmt.Fprintf(stderr, "admin: could not open database %q: %v\n", dbPath, err)
		return 1
	}
	defer conn.Close()

	if err := db.ApplyMigrations(conn, ctx); err != nil {
		fmt.Fprintf(stderr, "admin: could not apply migrations: %v\n", err)
		return 1
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
		fmt.Fprintf(stderr, "admin: could not update user: %v\n", err)
		return 1
	}

	affected, err := result.RowsAffected()
	if err != nil {
		fmt.Fprintf(stderr, "admin: could not verify update: %v\n", err)
		return 1
	}
	if affected == 0 {
		fmt.Fprintf(stderr, "admin: user %q not found in %q\n", name, dbPath)
		return 1
	}

	if *revoke {
		fmt.Fprintf(stdout, "Removed admin rights from %q in %q\n", name, dbPath)
		return 0
	}
	fmt.Fprintf(stdout, "Granted admin rights to %q in %q\n", name, dbPath)
	return 0
}

// resolveSqlitePath returns the explicitly configured database path. The flag
// wins over the environment variable, matching the server configuration order.
// There is deliberately no fallback: a guessed path would open the wrong
// database.
func resolveSqlitePath(flagValue string, getenv func(string) string) (string, error) {
	if path := strings.TrimSpace(flagValue); path != "" {
		return path, nil
	}
	if path := strings.TrimSpace(getenv("SQLITE_PATH")); path != "" {
		return path, nil
	}
	return "", errors.New("database path is not configured: pass -sqlite_path or set SQLITE_PATH")
}
