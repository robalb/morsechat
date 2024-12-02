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

func TestConn(t *testing.T){
	ctx := context.Background()
  ctx, cancel := context.WithTimeout(ctx, 2 * time.Second)
	t.Cleanup(cancel)

  db, err := NewConn(":memory:", ctx)
	if err != nil {
    t.Fatalf("error opening db: %v", err)
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
	if !reflect.DeepEqual(fetchedAuthor.Name, "Brian Kernighan"){
    t.Fatalf("error data mismatch, %v", fetchedAuthor)
  }

}


