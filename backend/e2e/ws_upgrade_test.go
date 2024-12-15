package e2e

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"testing"
	"time"

	"github.com/robalb/morsechat/internal/server"
)

func TestWsUpgradeEndpoint(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("Skipping E2E tests in short mode.")
	}
	ctx := context.Background()
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	t.Cleanup(cancel)

	tempdb, cleandb, err := NewVolatileSqliteFile()
	if err != nil {
		t.Fatalf("Could not generate temporary db file")
	}
	t.Cleanup(cleandb)

	port, err := RandomPort()
	if err != nil {
		t.Fatalf("Could not generate random port")
	}
	baseUrl := fmt.Sprintf("http://localhost:%d", port)
	healthUrl := fmt.Sprintf("%v/health", baseUrl)

	args := []string{
		"morsechat",
		"--port", fmt.Sprintf("%d", port),
		"--sqlite_path", tempdb,
	}
	fmt.Printf("aaaa %v", tempdb)
	getenv := func(key string) string {
		return ""
	}

	//start the webserver
	go func() {
		if err := server.Run(ctx, os.Stdout, os.Stderr, args, getenv); err != nil {
			cancel()
			t.Errorf("Failed to start server: %v", err)
		}
	}()

	err = WaitForReady(ctx, 2*time.Second, healthUrl)
	if err != nil {
		t.Fatalf("Readiness probe failed: %v", err)
	}

  // --------------------
	// Make a GET request to the /health endpoint
  // --------------------
  {
    resp, err := http.Get(healthUrl)
    if err != nil {
      t.Fatalf("Failed to make GET request: %v", err)
    }
    defer resp.Body.Close()
    // Validate response
    if resp.StatusCode != http.StatusOK {
      t.Errorf("Expected status code 200, got %d", resp.StatusCode)
    }
  }

  // --------------------
	// Make a GET request to the /nonexistent endpoint
  // --------------------
  {
    resp, err := http.Get(fmt.Sprintf("%s/nonexistent", baseUrl))
    if err != nil {
      t.Fatalf("Failed to make GET request: %v", err)
    }
    defer resp.Body.Close()
    // Validate response
    if resp.StatusCode != http.StatusNotFound {
      t.Errorf("Expected status code 404, got %d", resp.StatusCode)
    }
  }
}

