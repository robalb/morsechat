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
	"github.com/robalb/morsechat/internal/db"
	"github.com/robalb/morsechat/internal/wsserver"

	_ "github.com/mattn/go-sqlite3"
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
	// Init logging
	logger := log.New(stdout, "", log.Flags())
	logger.Println("starting... ")
	// Init config
	config, err := config.MakeConfig(args, getenv)
  if err != nil {
		logger.Printf("Failed to init app config: %v", err.Error())
		return err
  }
  logger.Printf("Starting server with config: Host:'%s', Port:'%s', SqlitePath:'%s', secret:'%s[CENSORED]'", 
    config.Host,
    config.Port,
    config.SqlitePath,
    config.Secret[0:5],
    )
	// Init JWT auth
	tokenAuth := jwtauth.New("HS256", config.SecretBytes, nil)
	// Init db
	dbWritePool, err := db.NewWritePool(config.SqlitePath, ctx)
	if err != nil {
		logger.Printf("Failed to init database write pool: %v", err.Error())
		return err
	}
	dbReadPool, err := db.NewReadPool(config.SqlitePath, ctx)
	if err != nil {
		logger.Printf("Failed to init database read pool: %v", err.Error())
		return err
	}
	err = db.ApplyMigrations(dbWritePool, ctx)
	if err != nil {
		logger.Printf("Failed to apply database migrations: %v", err.Error())
		return err
	}
	// Init websocket hub
	hub := wsserver.New()
	go hub.Run(
    ctx,
    logger,
    &config,
    dbReadPool,
    dbWritePool,
  )
	// Init Server
	srv := NewServer(
		logger,
		&config,
		hub,
		tokenAuth,
		dbReadPool,
		dbWritePool,
	)
	httpServer := &http.Server{
		Addr:    net.JoinHostPort(config.Host, config.Port),
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
		shutdownCtx, cancel := context.WithTimeout(shutdownCtx, 10*time.Second)
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
