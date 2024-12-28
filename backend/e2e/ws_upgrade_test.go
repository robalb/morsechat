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

	"github.com/gorilla/websocket"
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
	// --------------------
  //global data used in this story:
  registerData := map[string]string{
    "username": "testuser",
    "password": "securepassword123",
    "callsign": "US00ABC",
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
  // Step 2: Access /ws/init using the cookie and a proper websocket dialer
  // --------------------
  {
    dialer := websocket.Dialer{}

    headers := http.Header{}
    headers.Add("Cookie", cookie.Name+"="+cookie.Value)

	  wsURL := fmt.Sprintf("ws://localhost:%d/ws/init", port)
    conn, resp, err := dialer.Dial(wsURL, headers)
    if err != nil {
      t.Fatalf("Failed to connect to WebSocket endpoint: %v", err)
    }
    defer conn.Close()

    if resp.StatusCode != http.StatusSwitchingProtocols {
      t.Fatalf("Unexpected status code: %d", resp.StatusCode)
    }
  }

	// --------------------
  // Story: register as an anonymous user, then call the ws endpoint with the anon cookie
	// --------------------
   cookie = nil

  // --------------------
  // Step 1: Register as an anon user
  // --------------------
  {
    registerData := map[string]string{ }
    registerDataJSON, err := json.Marshal(registerData)
    if err != nil {
      t.Fatalf("Failed to marshal registration data: %v", err)
    }

    resp, err := http.Post(baseUrl+"/api/v1/sess_init", "application/json", bytes.NewBuffer(registerDataJSON))
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
  // Step 2: Access /ws/init using the cookie and a proper websocket dialer
  // --------------------
  {
    dialer := websocket.Dialer{}

    headers := http.Header{}
    headers.Add("Cookie", cookie.Name+"="+cookie.Value)

	  wsURL := fmt.Sprintf("ws://localhost:%d/ws/init", port)
    conn, resp, err := dialer.Dial(wsURL, headers)
    if err != nil {
      t.Fatalf("Failed to connect to WebSocket endpoint: %v", err)
    }
    defer conn.Close()

    if resp.StatusCode != http.StatusSwitchingProtocols {
      t.Fatalf("Unexpected status code: %d", resp.StatusCode)
    }
  }

}

