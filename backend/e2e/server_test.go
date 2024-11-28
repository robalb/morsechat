package test

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"testing"
	"time"

	main_morsechat "github.com/robalb/morsechat/cmd/morsechat/main"
	"github.com/robalb/morsechat/internal/server"
)

func TestHealthEndpoint(t *testing.T) {

	ctx := context.Background()
	if err := main_morsechat.Run(ctx, os.Stdout, os.Stderr, os.Args, os.Getenv); err != nil {
		fmt.Fprintf(os.Stderr, "%s\n", err)
		os.Exit(1)
	}
	// Start the server in a goroutine
	srv := server.NewServer() // Assuming `NewServer` returns your *http.Server
	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			t.Fatalf("Failed to start server: %v", err)
		}
	}()
	defer func() {
		// Shutdown the server after the test
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := srv.Shutdown(ctx); err != nil {
			t.Errorf("Failed to gracefully shutdown server: %v", err)
		}
	}()

	// Wait for the server to start
	time.Sleep(100 * time.Millisecond)

	// Make a GET request to the /health endpoint
	resp, err := http.Get("http://localhost:8080/health") // Update port if needed
	if err != nil {
		t.Fatalf("Failed to make GET request: %v", err)
	}
	defer resp.Body.Close()

	// Validate response
	if resp.StatusCode != http.StatusOK {
		t.Errorf("Expected status code 200, got %d", resp.StatusCode)
	}
}

