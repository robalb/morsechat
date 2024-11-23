package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"time"
  "context"
  "io"
  "os"
  "os/signal"
  "sync"
)

// var addr = flag.String("addr", ":8080", "http service address")

func run(ctx context.Context, w io.Writer, args []string) error {
	ctx, cancel := signal.NotifyContext(ctx, os.Interrupt)
	defer cancel()

  //? logger config?
	log.Println("starting... ")
	// flag.Parse()

	hub := newHub()
	go hub.run()

  srv := newServer(
    log.Default(), //TODO: init logger here, using the run func args
    hub,
    )

  httpServer := &http.Server{
    Addr:   ":8080", //TODO proper config
    Handler: srv,
  }

  //--------------------
  // Start the webserver
  //--------------------
  go func() {
    log.Printf("listening on %s\n", httpServer.Addr)
    if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
      fmt.Fprintf(os.Stderr, "error listening and serving: %s\n", err)
    }
  }()

  //--------------------
  // Graceful shutdown
  //--------------------
  var wg sync.WaitGroup
  // Webserver graceful shutdown
  //TODO: close websockets. Shutdown does not close websckets
  wg.Add(1)
  go func() {
    defer wg.Done()
    <-ctx.Done()
    log.Println("Gracefully shutting down webserver...")
    shutdownCtx := context.Background()
    shutdownCtx, cancel := context.WithTimeout(shutdownCtx, 10 * time.Second)
    defer cancel()
    if err := httpServer.Shutdown(shutdownCtx); err != nil {
      fmt.Fprintf(os.Stderr, "error shutting down http server: %s\n", err)
    }
  }()

  //example graceful shutdown (e.g could be used for a database)
  wg.Add(1)
  go func() {
    defer wg.Done()
    <-ctx.Done()
    log.Println("Gracefully shutting down test module...")
  }()

  wg.Wait()
  return nil
}

/**
The entry point for our webserver.
All code is organized for maximal
testability, according to the sacret scriptures: 
https://grafana.com/blog/2024/02/09/how-i-write-http-services-in-go-after-13-years/
*/
func main() {
	ctx := context.Background()
	if err := run(ctx, os.Stdout, os.Args); err != nil {
		fmt.Fprintf(os.Stderr, "%s\n", err)
		os.Exit(1)
	}
}
