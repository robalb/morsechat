package validation

import (
	"encoding/json"
	"net/http"
)

func RespondError(w http.ResponseWriter, err string, details string, code int) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.WriteHeader(code)
	response := map[string]string{"error": err, "details": details}
	json.NewEncoder(w).Encode(response)
}

func RespondOk(w http.ResponseWriter, data interface{}){
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(data)
}
