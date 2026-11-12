package e2e

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"testing"
	"time"

	"github.com/robalb/morsechat/internal/db"
	"github.com/robalb/morsechat/internal/server"
)

func registerE2EUser(t *testing.T, baseUrl, username, callsign string) *http.Cookie {
	t.Helper()

	payload, err := json.Marshal(map[string]string{
		"username": username,
		"password": "securepassword123",
		"callsign": callsign,
	})
	if err != nil {
		t.Fatalf("could not marshal registration payload: %v", err)
	}

	resp, err := http.Post(baseUrl+"/api/v1/register", "application/json", bytes.NewReader(payload))
	if err != nil {
		t.Fatalf("could not register %s: %v", username, err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		t.Fatalf("registration for %s returned %d: %s", username, resp.StatusCode, body)
	}

	for _, cookie := range resp.Cookies() {
		if cookie.Name == "jwt" {
			return cookie
		}
	}
	t.Fatalf("registration for %s did not set a jwt cookie", username)
	return nil
}

func jsonRequest(
	t *testing.T,
	method string,
	url string,
	cookie *http.Cookie,
	payload any,
) (*http.Response, []byte) {
	t.Helper()

	var body io.Reader
	if payload != nil {
		encoded, err := json.Marshal(payload)
		if err != nil {
			t.Fatalf("could not marshal request payload: %v", err)
		}
		body = bytes.NewReader(encoded)
	}

	req, err := http.NewRequest(method, url, body)
	if err != nil {
		t.Fatalf("could not create request: %v", err)
	}
	if payload != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if cookie != nil {
		req.AddCookie(cookie)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()
	data, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("could not read response body: %v", err)
	}
	return resp, data
}

// TestAdminModerationFlow covers the admin-only endpoints and verifies that
// role changes are enforced against the database immediately, even when the
// JWT claims are stale.
func TestAdminModerationFlow(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("Skipping E2E tests in short mode.")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	t.Cleanup(cancel)

	tempdb, cleandb, err := NewVolatileSqliteFile()
	if err != nil {
		t.Fatalf("could not generate temporary db file: %v", err)
	}
	t.Cleanup(cleandb)

	port, err := RandomPort()
	if err != nil {
		t.Fatalf("could not generate random port: %v", err)
	}
	baseUrl := fmt.Sprintf("http://localhost:%d", port)

	args := testServerArgs(port, tempdb)
	go func() {
		if err := server.Run(ctx, os.Stdout, os.Stderr, args, func(string) string { return "" }); err != nil {
			cancel()
			t.Errorf("failed to start server: %v", err)
		}
	}()

	if err := WaitForReady(ctx, 2*time.Second, baseUrl+"/health"); err != nil {
		t.Fatalf("readiness probe failed: %v", err)
	}

	adminCookie := registerE2EUser(t, baseUrl, "adminuser", "US00ADM")
	modCookie := registerE2EUser(t, baseUrl, "moduser", "US00MOD")

	// A regular user must not reach the admin endpoints.
	{
		resp, _ := jsonRequest(t, http.MethodGet, baseUrl+"/api/v1/admin/list_moderators", modCookie, nil)
		if resp.StatusCode != http.StatusUnauthorized {
			t.Fatalf("expected 401 for non-admin, got %d", resp.StatusCode)
		}
	}

	// Bootstrap the admin directly in the database, like cmd/admin does.
	writeConn, err := db.NewWritePool(tempdb, ctx)
	if err != nil {
		t.Fatalf("could not open write connection: %v", err)
	}
	defer writeConn.Close()
	if _, err := db.New(writeConn).SetAdmin(ctx, db.SetAdminParams{
		IsAdmin:  1,
		Username: "adminuser",
	}); err != nil {
		t.Fatalf("could not promote admin user: %v", err)
	}

	// The existing admin cookie now works: RequireAdmin checks the database.
	{
		resp, data := jsonRequest(t, http.MethodGet, baseUrl+"/api/v1/admin/list_moderators", adminCookie, nil)
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("expected 200 listing moderators, got %d: %s", resp.StatusCode, data)
		}
		var list struct {
			Moderators []struct {
				Username string `json:"username"`
			} `json:"moderators"`
		}
		if err := json.Unmarshal(data, &list); err != nil {
			t.Fatalf("could not decode moderator list: %v", err)
		}
	}

	// Promote the second user through the admin API.
	{
		resp, data := jsonRequest(t, http.MethodPost, baseUrl+"/api/v1/admin/set_moderator", adminCookie, map[string]string{
			"username": "moduser",
		})
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("expected 200 promoting moderator, got %d: %s", resp.StatusCode, data)
		}
	}

	// The moderator role is effective immediately, using the original JWT.
	{
		resp, data := jsonRequest(t, http.MethodPost, baseUrl+"/api/v1/moderation/list", modCookie, map[string]string{
			"query": "%",
		})
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("expected 200 for newly promoted moderator, got %d: %s", resp.StatusCode, data)
		}
	}

	// Demote the user and confirm the role is revoked immediately.
	{
		resp, data := jsonRequest(t, http.MethodPost, baseUrl+"/api/v1/admin/remove_moderator", adminCookie, map[string]string{
			"username": "moduser",
		})
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("expected 200 demoting moderator, got %d: %s", resp.StatusCode, data)
		}
	}
	{
		resp, _ := jsonRequest(t, http.MethodPost, baseUrl+"/api/v1/moderation/list", modCookie, map[string]string{
			"query": "%",
		})
		if resp.StatusCode != http.StatusUnauthorized {
			t.Fatalf("expected 401 after demotion, got %d", resp.StatusCode)
		}
	}

	// The ban activity log is readable by admins.
	{
		resp, data := jsonRequest(t, http.MethodGet, baseUrl+"/api/v1/admin/list_ban_activity?query=%25", adminCookie, nil)
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("expected 200 listing ban activity, got %d: %s", resp.StatusCode, data)
		}
		var activity struct {
			BanActions []any `json:"ban_actions"`
		}
		if err := json.Unmarshal(data, &activity); err != nil {
			t.Fatalf("could not decode ban activity: %v", err)
		}
	}
}
