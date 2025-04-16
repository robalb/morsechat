package db

import (
	"context"
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
