package db

import (
	"context"
	"database/sql"
	"testing"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

func TestForeignKey(t *testing.T) {
	ctx := context.Background()
	ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
	t.Cleanup(cancel)

	db, err := NewTestConn(":memory:", ctx)
	if err != nil {
		t.Fatalf("error opening db: %v", err)
	}

	queries := New(db)

	// create a user
	insertedUser, err := queries.CreateUser(ctx, CreateUserParams{
		Username:            "lorem",
		Password:            "fake_passwordhash",
		Callsign:            "US121X",
    Country:             "US",
		RegistrationSession: "afakeuuidv4",
	})
	if err != nil {
		t.Fatalf("error inserting into db")
	}

	insertedUserId, err := insertedUser.LastInsertId()
	if err != nil {
		t.Fatalf("error getting inserted id ")
	}

	res, err := queries.CreateReport(ctx, CreateReportParams{
		ReporterUserID:       sql.NullInt64{ 
      Int64: 1337,
      Valid: true, // we're lying
    }, //not a valid foreign key
		ReporterSession:      "afakeuuidv4",
		BaduserSession:       "anotherfakeuuidv4",
		BadmessageTranscript: "",
	})

	if err == nil {
		t.Fatalf("Using an invalid foreign key did not raise errors: %v", res)
	}

	res2, err := queries.CreateReport(ctx, CreateReportParams{
		ReporterUserID:       sql.NullInt64{ 
      Int64: insertedUserId,
      Valid: true,
    },
		ReporterSession:      "afakeuuidv4",
		BaduserSession:       "anotherfakeuuidv4",
		BadmessageTranscript: "",
	})

	if err != nil {
		t.Fatalf("error creating report with valid foreign key %v", err)
	}

	rows, err := res2.RowsAffected()
	if err != nil {
		t.Fatalf("Rows affected error: %v ", err)
	}

	if rows != 1 {
		t.Fatalf("Unexpected rows affected count: %v", rows)
	}

}
