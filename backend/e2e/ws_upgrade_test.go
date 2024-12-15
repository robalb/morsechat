package e2e

import (
	"bytes"
	"context"
	"encoding/json"
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
	// Make a GET request to the ws endpoint without a jwt
  // --------------------
  {
    resp, err := http.Get(baseUrl + "/ws/init")
    if err != nil {
      t.Fatalf("Failed to make GET request: %v", err)
    }
    defer resp.Body.Close()
    // Validate response
    if resp.StatusCode != 401 {
      t.Errorf("Expected status code 401, got %d", resp.StatusCode)
    }
  }

	// --------------------
  // Story: register an user, then call the ws endpoint with a logged jwt
  // a valid cookie
	// --------------------
  //global data used in this story:
  registerData := map[string]string{
    "username": "testuser",
    "password": "securepassword123",
    "callsign": "testcall",
  }
  var cookie *http.Cookie

  // --------------------
  // Step 1: Register a new user (also acts as login).
  // --------------------
  {
    registerDataJSON, err := json.Marshal(registerData)
    if err != nil {
      t.Fatalf("Failed to marshal registration data: %v", err)
    }

    resp, err := http.Post(baseUrl+"/api/v1/register", "application/json", bytes.NewBuffer(registerDataJSON))
    if err != nil {
      t.Fatalf("Failed to make POST request to register: %v", err)
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
      t.Fatalf("Expected status code 200 for registration, got %d", resp.StatusCode)
    }

    // Extract the cookie from the response.
    for _, c := range resp.Cookies() {
      if c.Name == "jwt" {
        cookie = c
        break
      }
    }
    if cookie == nil {
      t.Fatalf("Expected 'jwt' cookie to be set after registration, but it was not.")
    }
  }

  // --------------------
  // Step 2: Access /ws/init using the cookie, but without a proper ws handshake
  // --------------------
  {
    client := &http.Client{}
    req, err := http.NewRequest("GET", baseUrl+"/ws/init", nil)
    if err != nil {
      t.Fatalf("Failed to create GET request for /ws/init: %v", err)
    }

    req.AddCookie(cookie)
    resp, err := client.Do(req)
    if err != nil {
      t.Fatalf("Failed to make authenticated GET request to /ws/init: %v", err)
    }
    defer resp.Body.Close()

    if resp.StatusCode != 400 {
      t.Fatalf("Expected status code 400 for authenticated request to /ws/init, got %d", resp.StatusCode)
    }
  }

}

