package e2e

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/robalb/morsechat/internal/db"
)

func TestDatabase(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	t.Cleanup(cancel)


	tempdb, cleandb, err := NewVolatileSqliteFile()
	if err != nil {
		t.Fatalf("Could not generate temporary db file")
	}
	t.Cleanup(cleandb)

  dbWritePool, err := db.NewWritePool(tempdb, ctx)
	if err != nil {
		t.Fatalf("Failed to init database write pool: %v", err.Error())
	}
  dbReadPool, err := db.NewReadPool(tempdb, ctx)
	if err != nil {
		t.Fatalf("Failed to init database read pool: %v", err.Error())
	}
	err = db.ApplyMigrations(dbWritePool, ctx)
	if err != nil {
		t.Fatalf("Failed to apply database migrations: %v", err.Error())
	}

	readQueries := db.New(dbReadPool)
	writeQueries := db.New(dbWritePool)

	// perform a read query using the read pool
  {
    authors, err := readQueries.ListModerators(ctx)
    if err != nil {
      t.Fatalf("error query db: %v", err)
    }
    fmt.Println(authors)
  }

	// perform a write query using the read pool
  {
    _, err := readQueries.CreateUser(ctx, db.CreateUserParams{
      Username:            "lorem",
      Callsign:            "US121X",
      Country:             "US",
      RegistrationSession: "afakeuuidv4",
    })
    if err == nil {
      t.Fatalf("a write query on a readonly db connection did not raise errors")
    } else{
      fmt.Printf("db raised err as expected: %v", err)
    }
  }

	// perform a write query using the write pool
  {
    _, err := writeQueries.CreateUser(ctx, db.CreateUserParams{
      Username:            "lorem",
      Callsign:            "US121X",
      Country:             "US",
      RegistrationSession: "afakeuuidv4",
    })
    if err != nil {
      t.Fatalf("db error writing with a write connection")
    } 
  }

}

