package validation

import (
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

type UserLogin struct {
	Username string `json:"username" validate:"required"`
	Email    string `json:"email" validate:"required,email"`
}

func handler(w http.ResponseWriter, r *http.Request) {
	var user UserLogin
	if err := Bind(w, r, &user); err != nil {
		//Error response is already set by Bind
		return
	}
	w.Write([]byte("ok"))
}

func TestValidParse(t *testing.T) {
	reqbody := strings.NewReader("{\"username\":\"foo\", \"email\": \"test@example.com\"}")
	req := httptest.NewRequest("POST", "http://example.com/foo", reqbody)
	w := httptest.NewRecorder()
	handler(w, req)

	resp := w.Result()
	body, _ := io.ReadAll(resp.Body)

	if string(body) != "ok" {
		t.Fatalf("Error")
	}
}

func TestBadData(t *testing.T) {
	reqbody := strings.NewReader(".{\"username\":\"foo\", \"email\": \"notamail\"}")
	req := httptest.NewRequest("POST", "http://example.com/foo", reqbody)
	w := httptest.NewRecorder()
	handler(w, req)

	resp := w.Result()
	body, _ := io.ReadAll(resp.Body)

	fmt.Println(string(body))
	if resp.StatusCode != 400 {
		t.Fatalf("Invalid resp code")
	}
	if string(body) == "ok" {
		t.Fatalf("Error response")
	}
}

func TestEmptyBody(t *testing.T) {
	req := httptest.NewRequest("GET", "http://example.com/foo", nil)
	req.Header.Set("Content-Length", "0")
	w := httptest.NewRecorder()
	handler(w, req)

	resp := w.Result()
	body, _ := io.ReadAll(resp.Body)

	fmt.Println(resp.StatusCode)
	fmt.Println(resp.Header.Get("Content-Type"))
	fmt.Println(string(body))
	if resp.StatusCode != 400 {
		t.Fatalf("Invalid resp code")
	}
	if string(body) == "ok" {
		t.Fatalf("Error")
	}

}
