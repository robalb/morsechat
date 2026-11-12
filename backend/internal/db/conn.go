package db

import (
	"context"
	"database/sql"
	_ "embed"
	"fmt"
	"strings"
)

//go:embed schema.sql
var initscript string

// Temporary solution. We don't actually have migrations right now.
// We just execute the content of schema.sql every time, then apply the
// additive migrations that are required by databases created before the
// column was introduced. schema.sql uses CREATE TABLE IF NOT EXISTS, so it
// cannot add columns to an existing table by itself.
func ApplyMigrations(db *sql.DB, ctx context.Context) error {
	if _, err := db.ExecContext(ctx, initscript); err != nil {
		return err
	}
	return ensureColumn(ctx, db, "users", "is_admin", "INTEGER NOT NULL DEFAULT 0")
}

// ensureColumn adds a column to an existing table when it is missing.
// Table and column names are always constants controlled by the caller.
func ensureColumn(ctx context.Context, db *sql.DB, table string, column string, definition string) error {
	rows, err := db.QueryContext(ctx, fmt.Sprintf("PRAGMA table_info(%s)", table))
	if err != nil {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		var cid int
		var name string
		var columnType string
		var notNull int
		var defaultValue sql.NullString
		var primaryKey int
		if err := rows.Scan(&cid, &name, &columnType, &notNull, &defaultValue, &primaryKey); err != nil {
			return err
		}
		if name == column {
			return nil
		}
	}
	if err := rows.Err(); err != nil {
		return err
	}

	_, err = db.ExecContext(ctx, fmt.Sprintf(
		"ALTER TABLE %s ADD COLUMN %s %s",
		table,
		column,
		definition,
	))
	return err
}

// TODO: remove; use read and write pool instead, as detailed here
// https://github.com/mattn/go-sqlite3/issues/1022#issuecomment-1067353980
//
// Open an sqlite db connection, and apply migrations if necessary
// TODO: runtime pragmas, as seen here
// https://github.com/mtlynch/picoshare/blob/master/store/sqlite/sqlite.go
func NewTestConn(sqlitePath string, ctx context.Context) (*sql.DB, error) {
	// global, hardcoded sqlite config
	var sqliteConfig string = "?_foreign_keys=true"
	db, err := sql.Open("sqlite3", sqlitePath+sqliteConfig)
	if err != nil {
		return nil, err
	}
	err = ApplyMigrations(db, ctx)
	return db, nil
}

// Return a readonly connection to the sqlite database
// TODO: ping()
func NewReadPool(sqlitePath string, ctx context.Context) (*sql.DB, error) {
	// https://github.com/mattn/go-sqlite3/issues/1022#issuecomment-1067353980
	// https://github.com/mattn/go-sqlite3?tab=readme-ov-file#connection-string
	options := []string{
		"_foreign_keys=true",
		"_journal_mode=wal",
		"_busy_timeout=5000",
		"mode=ro",
	}
	connString := fmt.Sprintf("file:%s?%s", sqlitePath, strings.Join(options, "&"))
	return sql.Open("sqlite3", connString)
}

// Return a read+write connection to the sqlite database
func NewWritePool(sqlitePath string, ctx context.Context) (conn *sql.DB, err error) {
	// https://github.com/mattn/go-sqlite3/issues/1022#issuecomment-1067353980
	// https://github.com/mattn/go-sqlite3?tab=readme-ov-file#connection-string
	options := []string{
		"_foreign_keys=true",
		"_journal_mode=wal",
		"_txlock=immediate",
		"_busy_timeout=5000",
		"mode=rwc",
	}
	connString := fmt.Sprintf("file:%s?%s", sqlitePath, strings.Join(options, "&"))
	conn, err = sql.Open("sqlite3", connString)
	//sqlite does not support cuncurrent write
	conn.SetMaxOpenConns(1)
	return
}
