package db

import (
	"context"
	"database/sql"
  _ "embed"
)

//go:embed schema.sql
var initscript string;

// Temprary solution. We don't actually have migrations right now.
// We just execute the content of schema.sql every time
func applyMigrations(db *sql.DB, ctx context.Context) error{
	_, err := db.ExecContext(ctx, initscript)
  return err
}

// Open an sqlite db connection, and apply migrations if necessary
func NewConn(sqlitePath string, ctx context.Context) (*sql.DB, error){
	db, err := sql.Open("sqlite3", sqlitePath)
  if err != nil{
    return nil, err
  }
  err = applyMigrations(db, ctx)
  return db, nil
}


// func SQLite(t *testing.T, migrations []string) (*sql.DB, func()) {
// 	t.Helper()
// 	// For each test, pick a new database name at random.
// 	source, err := os.CreateTemp("", "sqltest_sqlite_")
// 	if err != nil {
// 		t.Fatal(err)
// 	}
// 	return CreateSQLiteDatabase(t, source.Name(), migrations)
// }

// func CreateSQLiteDatabase(t *testing.T, path string, migrations []string) (*sql.DB, func()) {
// 	t.Helper()

// 	t.Logf("open %s\n", path)
// 	sdb, err := sql.Open("sqlite", path)
// 	if err != nil {
// 		t.Fatal(err)
// 	}

// 	files, err := sqlpath.Glob(migrations)
// 	if err != nil {
// 		t.Fatal(err)
// 	}
// 	for _, f := range files {
// 		blob, err := os.ReadFile(f)
// 		if err != nil {
// 			t.Fatal(err)
// 		}
// 		if _, err := sdb.Exec(string(blob)); err != nil {
// 			t.Fatalf("%s: %s", filepath.Base(f), err)
// 		}
// 	}

// 	return sdb, func() {
// 		if _, err := os.Stat(path); err == nil {
// 			os.Remove(path)
// 		}
// 	}
// }
