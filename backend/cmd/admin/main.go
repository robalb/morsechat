package main

import (
	"context"
	"flag"
	"fmt"
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

	go run cmd/admin/main.go -username <username>
	go run cmd/admin/main.go -username <username> -revoke

The database path defaults to SQLITE_PATH, then to db.sqlite in the Go module
root (normally backend/), matching the server configuration even when the
command is run from cmd/admin.
*/
func main() {
	defaultPath := defaultSqlitePath(os.Getenv)

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

	dbPath, err := filepath.Abs(*sqlitePath)
	if err != nil {
		dbPath = *sqlitePath
	}
	if _, err := os.Stat(dbPath); os.IsNotExist(err) {
		fmt.Fprintf(os.Stderr, "admin: database %q does not exist\n", dbPath)
		fmt.Fprintln(os.Stderr, "admin: use -sqlite_path or SQLITE_PATH to point at the server database")
		os.Exit(1)
	}

	ctx := context.Background()
	conn, err := db.NewWritePool(dbPath, ctx)
	if err != nil {
		fmt.Fprintf(os.Stderr, "admin: could not open database %q: %v\n", dbPath, err)
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
		fmt.Fprintf(os.Stderr, "admin: user %q not found in %q\n", name, dbPath)
		os.Exit(1)
	}

	if *revoke {
		fmt.Printf("Removed admin rights from %q in %q\n", name, dbPath)
		return
	}
	fmt.Printf("Granted admin rights to %q in %q\n", name, dbPath)
}

// defaultSqlitePath mirrors the server default: SQLITE_PATH when set,
// otherwise db.sqlite in the Go module root. Resolving the module root instead
// of the current directory means "go run main.go" also works from cmd/admin,
// where a bare db.sqlite would create a new empty database.
func defaultSqlitePath(getenv func(string) string) string {
	if path := getenv("SQLITE_PATH"); path != "" {
		return path
	}
	if root, ok := findModuleRoot(); ok {
		return filepath.Join(root, "db.sqlite")
	}
	return "db.sqlite"
}

func findModuleRoot() (string, bool) {
	dir, err := os.Getwd()
	if err != nil {
		return "", false
	}
	for {
		if _, err := os.Stat(filepath.Join(dir, "go.mod")); err == nil {
			return dir, true
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			return "", false
		}
		dir = parent
	}
}
