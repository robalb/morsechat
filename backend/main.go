package main

import (
	"fmt"
	"log"
	"net/http"
  "net"
	"time"
  "context"
  "io"
  "os"
  "os/signal"
  "sync"
)

func run(
  ctx context.Context,
  stdout io.Writer,
  stderr io.Writer,
  args []string,
  getenv func(string) string,
) error {
	ctx, cancel := signal.NotifyContext(ctx, os.Interrupt)
	defer cancel()

  //--------------------
  // Init everything
  //--------------------
  // Init logging
  logger := log.New(stdout, "morse: ", log.Flags())
	logger.Println("starting... ")
  // Init config
  config := MakeConfig(args, getenv)
  // Init hub
	hub := newHub()
	go hub.run()
  // Init Server
  srv := newServer(
    logger,
    config,
    hub,
    )
  httpServer := &http.Server{
    Addr:   net.JoinHostPort(config.host, config.port),
    Handler: srv,
  }

  //--------------------
  // Start the webserver
  //--------------------
  go func() {
    logger.Printf("listening on %s\n", httpServer.Addr)
    if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
      fmt.Fprintf(stderr, "error listening and serving: %s\n", err)
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
    logger.Println("Gracefully shutting down webserver...")
    shutdownCtx := context.Background()
    shutdownCtx, cancel := context.WithTimeout(shutdownCtx, 10 * time.Second)
    defer cancel()
    if err := httpServer.Shutdown(shutdownCtx); err != nil {
      fmt.Fprintf(stderr, "error shutting down http server: %s\n", err)
    }
  }()

  //example graceful shutdown (e.g could be used for a database)
  wg.Add(1)
  go func() {
    defer wg.Done()
    <-ctx.Done()
    logger.Println("Gracefully shutting down test module...")
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
	if err := run(ctx, os.Stdout, os.Stderr, os.Args, os.Getenv); err != nil {
		fmt.Fprintf(os.Stderr, "%s\n", err)
		os.Exit(1)
	}
}
