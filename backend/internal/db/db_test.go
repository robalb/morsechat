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

// For this test to pass, you must first compile the
// sql files using sqlc. Check out this project docs


func TestDb(t *testing.T){
	ctx := context.Background()
  ctx, cancel := context.WithTimeout(ctx, 2 * time.Second)
	t.Cleanup(cancel)


	db, err := sql.Open("sqlite3", ":memory:")
	if err != nil {
    t.Fatalf("error opening db")
	}

	// create tables
  var ddl string;
	if _, err := db.ExecContext(ctx, ddl); err != nil {
    t.Fatalf("error creating tables")
	}


	queries := New(db)


	// list all authors
	authors, err := queries.ListAuthors(ctx)
	if err != nil {
    t.Fatalf("error query db: %v", err)
	}
	fmt.Println(authors)

	// create an author
	insertedAuthor, err := queries.CreateAuthor(ctx, CreateAuthorParams{
		Name: "Brian Kernighan",
		Bio:  sql.NullString{String: "Co-author of The C Programming Language and The Go Programming Language", Valid: true},
	})
	if err != nil {
    t.Fatalf("error inserting into db")
	}

  id, err := insertedAuthor.LastInsertId()
	if err != nil {
    t.Fatalf("error getting inserted id ")
	}
	// get the author we just inserted
	fetchedAuthor, err := queries.GetAuthor(ctx, id)
	if err != nil {
    t.Fatalf("error selecting data from db")
	}

	// prints true
	if !reflect.DeepEqual(insertedAuthor, fetchedAuthor){
    t.Fatalf("error data mismatch")
  }

}


