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

func TestAuth(t *testing.T) {
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
	// call logged endpoint, without cookie
  // --------------------
  {
    resp, err := http.Get(baseUrl + "/api/v1/user/me/")
    if err != nil {
      t.Fatalf("Failed to make GET request: %v", err)
    }
    if resp.StatusCode != 401 {
      t.Errorf("Expected status code 401, got %d", resp.StatusCode)
    }
  }

	// --------------------
  // Story: register an user, then call logged-only endpoints with
  // a valid cookie
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
  // Step 2: Access /api/v1/user/me using the cookie to verify successful login.
  // --------------------
  {
    client := &http.Client{}
    req, err := http.NewRequest("GET", baseUrl+"/api/v1/user/me", nil)
    if err != nil {
      t.Fatalf("Failed to create GET request for /api/v1/user/me: %v", err)
    }

    req.AddCookie(cookie)
    resp, err := client.Do(req)
    if err != nil {
      t.Fatalf("Failed to make authenticated GET request to /api/v1/user/me: %v", err)
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
      t.Fatalf("Expected status code 200 for authenticated request to /api/v1/user/me, got %d", resp.StatusCode)
    }

    // Verify that the response body contains correct user information.
    var userInfo struct {
      Username              string `json:"username"`
      Callsign              string `json:"callsign"`
      LastOnlineTimestamp   int64  `json:"last_online_timestamp"`
      RegistrationTimestamp int64  `json:"registration_timestamp"`
    }
    err = json.NewDecoder(resp.Body).Decode(&userInfo)
    if err != nil {
      t.Fatalf("Failed to decode JSON response: %v", err)
    }

    if userInfo.Username != registerData["username"] || userInfo.Callsign != registerData["callsign"] {
      t.Errorf("User info does not match. Got %+v", userInfo)
    }
  }

  // --------------------
  // step 3: attempt to call an ADMIN only endpoint with a valid, but non-amin cookie
  // --------------------
  {
    client := &http.Client{}
    req, err := http.NewRequest("POST", baseUrl+"/api/v1/admin/set_moderator", nil)
    if err != nil {
      t.Fatalf("Failed to create GET request for /api/v1/user/me: %v", err)
    }
    // Add the valid cookie to the request
    req.AddCookie(cookie)

    resp, err := client.Do(req)
    if err != nil {
      t.Fatalf("Failed to make GET request with invalid JWT: %v", err)
    }
    defer resp.Body.Close()

    // Validate the response.
    if resp.StatusCode != http.StatusUnauthorized {
      t.Errorf("Expected status code 401 for invalid JWT, got %d", resp.StatusCode)
    }

    // Check for an error message in the response body.
    {
      var errorResponse struct {
        Error   string `json:"error"`
        Details string `json:"details"`
      }
      err = json.NewDecoder(resp.Body).Decode(&errorResponse)
      if err != nil {
        t.Fatalf("Failed to decode JSON error response: %v", err)
      }

      expectedMessage := "Not an admin"
      if errorResponse.Details != expectedMessage {
        t.Errorf("Expected error message '%s', got '%s'", expectedMessage, errorResponse.Error)
      }
    }
  }

  // --------------------
  // Step 4: attempt to call an auth-required endpoint after a user registration,
  //         but without a valid cookie
  // --------------------
  {
    client := &http.Client{}
    // Attempt to access /api/v1/user/me with an invalid JWT.
    req, err := http.NewRequest("GET", baseUrl+"/api/v1/user/me", nil)
    if err != nil {
      t.Fatalf("Failed to create GET request for /api/v1/user/me: %v", err)
    }
    resp, err := client.Do(req)
    if err != nil {
      t.Fatalf("Failed to make GET request to /api/v1/user/me: %v", err)
    }
    // Check for an error message in the response body.
    var errorResponse struct {
      Error   string `json:"error"`
      Details string `json:"details"`
    }
    err = json.NewDecoder(resp.Body).Decode(&errorResponse)
    if err != nil {
      t.Fatalf("Failed to decode JSON error response: %v", err)
    }

    expectedMessage := "Unauthorized"
    if errorResponse.Error != expectedMessage {
      t.Errorf("Expected error message '%s', got '%s'", expectedMessage, errorResponse.Error)
    }
  }


  // --------------------
  // Visit an admin-only path with a malformed jwt
  // --------------------
  {
    client := &http.Client{}
    req, err := http.NewRequest("GET", baseUrl+"/api/v1/user/me", nil)
    // Add an invalid JWT cookie.
    invalidCookie := &http.Cookie{
      Name:  "jwt",
      Value: "invalid.token.here",
    }
    req.AddCookie(invalidCookie)

    resp, err := client.Do(req)
    if err != nil {
      t.Fatalf("Failed to make GET request with invalid JWT: %v", err)
    }
    defer resp.Body.Close()

    // Validate the response.
    if resp.StatusCode != http.StatusUnauthorized {
      t.Errorf("Expected status code 401 for invalid JWT, got %d", resp.StatusCode)
    }

    // Check for an error message in the response body.
    var errorResponse struct {
      Error   string `json:"error"`
      Details string `json:"details"`
    }
    err = json.NewDecoder(resp.Body).Decode(&errorResponse)
    if err != nil {
      t.Fatalf("Failed to decode JSON error response: %v", err)
    }

    expectedMessage := "Unauthorized"
    if errorResponse.Error != expectedMessage {
      t.Errorf("Expected error message '%s', got '%s'", expectedMessage, errorResponse.Error)
    }
  }

}
