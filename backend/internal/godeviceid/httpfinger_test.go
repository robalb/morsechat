package deviceid

import (
	"net/http"
	"strings"
	"testing"
)

func TestGetHttpFinger(t *testing.T) {
	tests := []struct {
		name           string
		request        *http.Request
		expectedPrefix string // We'll check that the start of the fingerprint is correct
	}{
		{
			name: "Standard HTTP/2 with Accept-Language and User-Agent",
			request: func() *http.Request {
				req, _ := http.NewRequest("GET", "http://example.com", nil)
				req.ProtoMajor = 2
				req.ProtoMinor = 0
				req.Header.Set("Accept-Language", "en-US,en;q=0.9")
				req.Header.Set("User-Agent", "TestAgent/1.0")
				req.Header.Set("X-Test-Header", "value")
				return req
			}(),
			expectedPrefix: "20enus2w01", // HTTP/2 + "enus"
		},
		{
			name: "HTTP/1.1 with short Accept-Language",
			request: func() *http.Request {
				req, _ := http.NewRequest("GET", "http://example.com", nil)
				req.ProtoMajor = 1
				req.ProtoMinor = 1
				req.Header.Set("Accept-Language", "ES")
				req.Header.Set("save-data", "no")
				req.Header.Set("User-Agent", "ShortLangAgent/1.0")
				return req
			}(),
			expectedPrefix: "11esxx1n02", // HTTP/1.1 + "esxx" padded
		},
		{
			name: "HTTP/1.1 with short Accept-Language and weights",
			request: func() *http.Request {
				req, _ := http.NewRequest("GET", "http://example.com", nil)
				req.ProtoMajor = 1
				req.ProtoMinor = 1
				req.Header.Set("Accept-Language", "ES;q=0.9")
				req.Header.Set("save-data", "no")
				req.Header.Set("DNT", "no")
				req.Header.Set("User-Agent", "ShortLangAgent/1.0")
				return req
			}(),
			expectedPrefix: "11esxx1w03", // HTTP/1.1 + "esxx" padded
		},
		{
			name: "Missing Accept-Language",
			request: func() *http.Request {
				req, _ := http.NewRequest("GET", "http://example.com", nil)
				req.ProtoMajor = 1
				req.ProtoMinor = 0
				req.Header.Set("User-Agent", "NoLangAgent/1.0")
				return req
			}(),
			expectedPrefix: "10xxxx0n00", // HTTP/1.0 + "none"
		},
		{
			name: "Cookie should not count as header",
			request: func() *http.Request {
				req, _ := http.NewRequest("GET", "http://example.com", nil)
				req.ProtoMajor = 1
				req.ProtoMinor = 1
				req.Header.Set("Accept-Language", "en-GB")
				req.Header.Set("User-Agent", "CookieAgent/1.0")
				req.Header.Set("Cookie", "sessionid=12345")
				req.Header.Set("X-Test", "1")
				return req
			}(),
			expectedPrefix: "11engb1n01", // Cookie is ignored, "engb" from lang
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			fp := getHttpFinger(tt.request)
			t.Logf("Fingerprint: %s", fp)
			if !strings.HasPrefix(fp, tt.expectedPrefix) {
				t.Errorf("Expected fingerprint to start with '%s', got '%s'", tt.expectedPrefix, fp)
			}
		})
	}
}

func TestGetHttpFingerHeaders(t *testing.T) {
	req1, _ := http.NewRequest("GET", "http://example.com", nil)
	req1.ProtoMajor = 2
	req1.ProtoMinor = 0
	req1.Header.Set("Accept-Language", "en-US,en;q=0.9")
	req1.Header.Set("User-Agent", "TestAgent/1.0")
	req1.Header.Set("X-Test-Header", "value")
	fp1 := getHttpFinger(req1)

	req2, _ := http.NewRequest("GET", "http://example.com", nil)
	req2.ProtoMajor = 2
	req2.ProtoMinor = 0
	req2.Header.Set("X-Another-Test-Header2", "value")
	req2.Header.Set("User-Agent", "TestAgent/1.0")
	req2.Header.Set("Cookie", "saaomecookie")
	req2.Header.Set("Accept-Language", "en-US,en;q=0.9")
	fp2 := getHttpFinger(req2)

	if fp1 != fp2 {
		t.Errorf("Expected two identical fingerprints, got '%s' and '%s'", fp1, fp2)
	}
}

func TestGetHttpFingerMalicious(t *testing.T) {
	req1, _ := http.NewRequest("GET", "http://example.com", nil)
	req1.ProtoMajor = 9
	req1.ProtoMinor = 107
	req1.Header.Set("Accept-Language", "' - --")
	fp1 := getHttpFinger(req1)
	expected := "97xxxx1n01_a42c4da1bc00_000000000000"

	if fp1 != expected {
		t.Errorf("Expected fingerprint to be  '%s', got '%s'", expected, fp1)
	}
}
