package server

import (
	"context"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"time"

	"github.com/go-chi/jwtauth/v5"
	"github.com/robalb/morsechat/internal/config"
)

func Run(
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
  //TODO: temporary init. Danger: unsafe
  tokenAuth := jwtauth.New("HS256", []byte("secret"), nil)
  // Init logging
  logger := log.New(stdout, "", log.Flags())
	logger.Println("starting... ")
  // Init config
  config := config.MakeConfig(args, getenv)
  // Init hub
	hub := NewHub()
	go hub.Run()
  // Init Server
  srv := NewServer(
    logger,
    config,
    hub,
    tokenAuth,
    )
  httpServer := &http.Server{
    Addr:   net.JoinHostPort(config.Host, config.Port),
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

