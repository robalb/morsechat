package server

import (
	"context"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"github.com/go-chi/jwtauth/v5"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/collectors"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/robalb/morsechat/internal/config"
	"github.com/robalb/morsechat/internal/db"
	"github.com/robalb/morsechat/internal/monitoring"
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
	ctx, cancel := signal.NotifyContext(ctx,
    syscall.SIGINT,  // ctr-C from the terminal
    syscall.SIGTERM, // terminate signal from Docker / kubernetes
    )
	defer cancel()

	//--------------------
	// Initialize logging
	//--------------------
	logger := log.New(stdout, "", log.Flags())
	logger.Println("starting... ")

	//--------------------
	// Initialize the global configuration object
	//--------------------
	config, err := config.MakeConfig(args, getenv)
  if err != nil {
		logger.Printf("Failed to init app config: %v", err.Error())
		return err
  }
  logger.Printf("Starting server with config: %v", config.LogSafeSummary())

	//--------------------
	// Initialize JWT auth
	//--------------------
	tokenAuth := jwtauth.New("HS256", config.SecretBytes, nil)

	//--------------------
	// Initialize the sqlite databases
	//--------------------
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

	//--------------------
	// Initialize monitoring
	//--------------------
  metricsRegistry := prometheus.NewRegistry()
  metricsRegistry.MustRegister(collectors.NewDBStatsCollector(dbReadPool, "readpool"))
  metricsRegistry.MustRegister(collectors.NewDBStatsCollector(dbWritePool, "writepool"))
  // metricsRegistry.MustRegister(collectors.NewGoCollector())
  metrics := monitoring.NewMetrics(metricsRegistry)
  promServer := &http.Server{
    Addr:    net.JoinHostPort(config.Host, config.MetricsPort),
    Handler: promhttp.HandlerFor(metricsRegistry, promhttp.HandlerOpts{}),
  }

	//--------------------
	// Initialize the websocket hub
	//--------------------
	hub := wsserver.New()
	go hub.Run(
    ctx,
    logger,
    &config,
    dbReadPool,
    dbWritePool,
    metrics,
  )

	//--------------------
	// Initialize the API Server
	//--------------------
	srv := NewServer(
		logger,
		&config,
		hub,
		tokenAuth,
		dbReadPool,
		dbWritePool,
    metrics,
	)
	httpServer := &http.Server{
		Addr:    net.JoinHostPort(config.Host, config.Port),
		Handler: srv,
	}

	//--------------------
	// Start the webserver
	//--------------------
	go func() {
    logger.Printf("API server: listening on %s\n", httpServer.Addr)
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			fmt.Fprintf(stderr, "error listening and serving: %s\n", err)
		}
	}()

	//--------------------
	// Start the prometheus server
	//--------------------
	go func() {
    if !config.MetricsEnabled {
      logger.Println("Prometheus server: disabled.")
      return
    }
    logger.Printf("Prometheus server: listening on %s\n", promServer.Addr)
		if err := promServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
      fmt.Fprintf(stderr, "Prometheus server: error listening and serving: %s\n", err)
		}
	}()

	//--------------------
	// Graceful shutdown
	//--------------------
	var wg sync.WaitGroup
	// API server graceful shutdown TODO: also close websockets
	wg.Add(1)
	go func() {
		defer wg.Done()
		<-ctx.Done()
		logger.Println("Gracefully shutting down API server...")
		shutdownCtx := context.Background()
		shutdownCtx, cancel := context.WithTimeout(shutdownCtx, 10*time.Second)
		defer cancel()
		if err := httpServer.Shutdown(shutdownCtx); err != nil {
			fmt.Fprintf(stderr, "error shutting down API server: %s\n", err)
		}else{
      logger.Println("API server shutdown done")
    }
	}()
  //Prometheus server graceful shutdown
  wg.Add(1)
  go func() {
		defer wg.Done()
		<-ctx.Done()
		logger.Println("Gracefully shutting down Prometheus server...")
		shutdownCtx := context.Background()
		shutdownCtx, cancel := context.WithTimeout(shutdownCtx, 5*time.Second)
		defer cancel()
		if err := promServer.Shutdown(shutdownCtx); err != nil {
			fmt.Fprintf(stderr, "error shutting down Prometheus server: %s\n", err)
		}else{
      logger.Println("Prometheus server shutdown done")
    }
  }()
	// Example graceful shutdown (e.g could be used for a database)
	wg.Add(1)
	go func() {
		defer wg.Done()
		<-ctx.Done()
		logger.Println("Gracefully shutting down test module...")
		logger.Println("test module shutdown done")
	}()

	wg.Wait()
	return nil
}
