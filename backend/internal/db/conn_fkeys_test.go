package db

import (
	"context"
	"testing"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

func TestForeignKey(t *testing.T) {
	ctx := context.Background()
	ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
	t.Cleanup(cancel)

	db, err := NewConn(":memory:", ctx)
	if err != nil {
		t.Fatalf("error opening db: %v", err)
	}

	queries := New(db)

	// create a user
	insertedUser, err := queries.CreateUser(ctx, CreateUserParams{
		Username:            "lorem",
		Callsign:            "US121X",
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
		ReporterUserID:       1337, //not a valid foreign key
		ReporterSession:      "afakeuuidv4",
		BaduserSession:       "anotherfakeuuidv4",
		BadmessageTranscript: "",
		BadmessageRecording:  "",
	})

	if err == nil {
		t.Fatalf("Using an invalid foreign key did not raise errors: %v", res)
	}

	res2, err := queries.CreateReport(ctx, CreateReportParams{
		ReporterUserID:       insertedUserId,
		ReporterSession:      "afakeuuidv4",
		BaduserSession:       "anotherfakeuuidv4",
		BadmessageTranscript: "",
		BadmessageRecording:  "",
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
