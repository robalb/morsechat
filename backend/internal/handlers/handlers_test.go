package handlers

import (
	"fmt"
	"io"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestDbHealth(t *testing.T){
  reqbody := strings.NewReader("{\"username\":\"fooz\", \"email\": \"testcom\"}")
	req := httptest.NewRequest("POST", "http://example.com/foo", reqbody)
	w := httptest.NewRecorder()
	ServeDbHealth(1337)(w, req)

	resp := w.Result()
	body, _ := io.ReadAll(resp.Body)

	fmt.Println(resp.StatusCode)
	fmt.Println(resp.Header.Get("Content-Type"))
	fmt.Println(string(body))
  if string(body) == "asd" {
    t.Fatalf("Error")
  }

}
