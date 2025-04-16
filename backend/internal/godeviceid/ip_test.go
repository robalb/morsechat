package deviceid

import (
	"net/http"
	"testing"
)

func TestIpRequests(t *testing.T) {
	// NOTE: 192.0.2.0/24 is "TEST-NET" in RFC 5737 for use solely in
	// documentation and example source code and should not be used publicly.
	tests := []struct {
		name       string
		ipHeaders  []string
		request    *http.Request
		expectedIp string // We'll check that the start of the fingerprint is correct
	}{
		{
			name:      "no headers in config",
			ipHeaders: []string{},
			request: func() *http.Request {
				req, _ := http.NewRequest("GET", "http://example.com", nil)
				req.RemoteAddr = "192.0.2.0:1234"
				req.Header.Set("X-Real-IP", "192.0.2.1")
				req.Header.Set("X-Test-Header", "192.0.2.2")
				req.Header.Set("X-Forwarded-For", "192.0.2.3")
				return req
			}(),
			expectedIp: "192.0.2.0",
		},
		{
			name:      "no headers in req",
			ipHeaders: []string{"X-Forwarded-For"},
			request: func() *http.Request {
				req, _ := http.NewRequest("GET", "http://example.com", nil)
				req.RemoteAddr = "192.0.2.0:1234"
				req.Header.Set("X-Real-IP", "192.0.2.1")
				req.Header.Set("X-Test-Header", "192.0.2.2")
				return req
			}(),
			expectedIp: "192.0.2.0",
		},
		{
			name:      "header ip is present",
			ipHeaders: []string{"X-Forwarded-For"},
			request: func() *http.Request {
				req, _ := http.NewRequest("GET", "http://example.com", nil)
				req.RemoteAddr = "192.0.2.0:1234"
				req.Header.Set("X-Forwarded-For", "192.0.2.3")
				return req
			}(),
			expectedIp: "192.0.2.3",
		},
		{
			name:      "header ip is present, with other headers",
			ipHeaders: []string{"X-weird-ipheader"},
			request: func() *http.Request {
				req, _ := http.NewRequest("GET", "http://example.com", nil)
				req.RemoteAddr = "192.0.2.0:1234"
				req.Header.Set("X-weird-ipheader", "192.0.2.1")
				req.Header.Set("X-Test-Header", "192.0.2.2")
				req.Header.Set("X-Forwarded-For", "192.0.2.3")
				return req
			}(),
			expectedIp: "192.0.2.1",
		},
		{
			name:      "header ip is present, malformed",
			ipHeaders: []string{"X-Real-IP"},
			request: func() *http.Request {
				req, _ := http.NewRequest("GET", "http://example.com", nil)
				req.RemoteAddr = "192.0.2.0:1234"
				req.Header.Set("X-Forwarded-For", "192.0.2.1")
				req.Header.Set("X-Real-IP", "' -- '")
				return req
			}(),
			expectedIp: "192.0.2.0",
		},
		{
			name:      "multiple ips in X-Forwarded-For",
			ipHeaders: []string{"X-Forwarded-For"},
			request: func() *http.Request {
				req, _ := http.NewRequest("GET", "http://example.com", nil)
				req.RemoteAddr = "192.0.2.0:1234"
				req.Header.Set("X-Forwarded-For", "192.0.2.1,192.0.2.2")
				return req
			}(),
			expectedIp: "192.0.2.1",
		},
		{
			name:      "multiple ips in X-Forwarded-For, spaced",
			ipHeaders: []string{"X-Forwarded-For"},
			request: func() *http.Request {
				req, _ := http.NewRequest("GET", "http://example.com", nil)
				req.RemoteAddr = "192.0.2.0:1234"
				req.Header.Set("X-Forwarded-For", "192.0.2.1, 192.0.2.2")
				return req
			}(),
			expectedIp: "192.0.2.1",
		},
		{
			name:      "lots of ips in X-Forwarded-For, spaced",
			ipHeaders: []string{"X-Forwarded-For"},
			request: func() *http.Request {
				req, _ := http.NewRequest("GET", "http://example.com", nil)
				req.RemoteAddr = "192.0.2.0:1234"
				req.Header.Set("X-Forwarded-For", "192.0.2.1, 192.0.2.2, 192.0.2.3, 192.0.2.4, 192.0.2.5, 192.0.2.6, 192.0.2.7, 192.0.2.8, 192.0.2.9, 192.0.2.10, 192.0.2.11, 192.0.2.12, 192.0.2.13, 192.0.2.14, 192.0.2.15, 192.0.2.16, 192.0.2.17, 192.0.2.18, 192.0.2.19, 192.0.2.20, 192.0.2.21, 192.0.2.22, 192.0.2.23, 192.0.2.24, 192.0.2.25, 192.0.2.26")
				return req
			}(),
			expectedIp: "192.0.2.1",
		},
		{
			name: "multiple ip headers",
			ipHeaders: []string{
				"X-Forwarded-For",
				"Other-IP-h",
			},
			request: func() *http.Request {
				req, _ := http.NewRequest("GET", "http://example.com", nil)
				req.RemoteAddr = "192.0.2.0:1234"
				req.Header.Set("X-Forwarded-For", "192.0.2.1, 192.0.2.2")
				req.Header.Set("Other-IP-h", "192.0.2.3")
				return req
			}(),
			expectedIp: "192.0.2.1",
		},
		{
			name: "multiple ip headers, order",
			ipHeaders: []string{
				"Other-IP-h",
				"X-Forwarded-For",
			},
			request: func() *http.Request {
				req, _ := http.NewRequest("GET", "http://example.com", nil)
				req.RemoteAddr = "192.0.2.0:1234"
				req.Header.Set("X-Forwarded-For", "192.0.2.1, 192.0.2.2")
				req.Header.Set("Other-IP-h", "192.0.2.3")
				return req
			}(),
			expectedIp: "192.0.2.3",
		},

		{
			name:      "empty string on error",
			ipHeaders: []string{},
			request: func() *http.Request {
				req, _ := http.NewRequest("GET", "http://example.com", nil)
				req.RemoteAddr = "weirderror"
				return req
			}(),
			expectedIp: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ip := getIp(tt.request, tt.ipHeaders)
			t.Logf("ip: %s", ip)
			if ip != tt.expectedIp {
				t.Errorf("Expected ip '%s', got '%s'", tt.expectedIp, ip)
			}
		})
	}
}
