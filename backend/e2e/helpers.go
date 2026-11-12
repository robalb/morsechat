package e2e

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"math/big"
	"net/http"
	"os"
	"time"
)

// testSecret is a valid app secret (base64 of 32 bytes) for the test servers.
var testSecret = base64.StdEncoding.EncodeToString(make([]byte, 32))

// testServerArgs returns the explicit configuration for an e2e server. The
// server has no defaults, so every value the tests need is provided here.
func testServerArgs(port int, dbPath string) []string {
	return []string{
		"morsechat",
		"--host", "127.0.0.1",
		"--port", fmt.Sprintf("%d", port),
		"--sqlite_path", dbPath,
		"--secret", testSecret,
		"--metrics_enabled=false",
	}
}

// waitForReady calls the specified endpoint until it gets a 200
// response or until the context is cancelled or the timeout is
// reached.
func WaitForReady(
	ctx context.Context,
	timeout time.Duration,
	endpoint string,
) error {
	client := http.Client{}
	startTime := time.Now()
	for {
		req, err := http.NewRequestWithContext(
			ctx,
			http.MethodGet,
			endpoint,
			nil,
		)
		if err != nil {
			return fmt.Errorf("failed to create request: %w", err)
		}

		resp, err := client.Do(req)
		if err != nil {
			fmt.Printf("Error making request: %s\n", err.Error())
		} else if resp.StatusCode == http.StatusOK {
			fmt.Println("Endpoint is ready!")
			resp.Body.Close()
			return nil
		}

		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
			if time.Since(startTime) >= timeout {
				return fmt.Errorf("timeout reached while waiting for endpoint")
			}
			// wait a little while between checks
			time.Sleep(200 * time.Millisecond)
		}
	}
}

func RandomPort() (int, error) {
	const minPort = 1024
	const maxPort = 65535
	rangeSize := maxPort - minPort + 1
	n, err := rand.Int(rand.Reader, big.NewInt(int64(rangeSize)))
	if err != nil {
		return 0, err
	}
	return int(n.Int64()) + minPort, nil
}

// Create on-disk a new sqlite file, and return its name
// whith a cleanup function that deletes it.
func NewVolatileSqliteFile() (path string, cleanup func(), err error) {
	tmp, err := os.CreateTemp("", "morsechatdbtest")
	if err != nil {
		return "", nil, err
	}
	path = tmp.Name()
	cleanup = func() {
		if _, err := os.Stat(path); err == nil {
			os.Remove(path)
		}
	}
	return
}
