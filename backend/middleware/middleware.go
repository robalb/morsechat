package middleware

import (
	"net/http"
	"time"
  "log"
  "runtime/debug"
)

type Middleware func (http.Handler) http.Handler

//--------------------
// Logging middleware
//--------------------

type responseWriter struct {
  http.ResponseWriter
  status      int
  wroteHeader bool
}

func wrapResponseWriter(w http.ResponseWriter) *responseWriter {
  return &responseWriter{ResponseWriter: w}
}

func (rw *responseWriter) Status() int {
  return rw.status
}

func (rw *responseWriter) WriteHeader(code int) {
  if rw.wroteHeader {
    return
  }

  rw.status = code
  rw.ResponseWriter.WriteHeader(code)
  rw.wroteHeader = true

  return
}

func NewLogging(logger *log.Logger) Middleware{
  return func (next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
      start := time.Now()
      next.ServeHTTP(w, r)
      logger.Printf("api: %v", start)
    })
  }
}

func LoggingMiddleware(logger *log.Logger) Middleware {
  return func(next http.Handler) http.Handler {
    fn := func(w http.ResponseWriter, r *http.Request) {
      defer func() {
        if err := recover(); err != nil {
          w.WriteHeader(http.StatusInternalServerError)
          logger.Println(
            "http:",
            "err", err,
            "trace", debug.Stack(),
          )
        }
      }()

      start := time.Now()
      wrapped := wrapResponseWriter(w)
      next.ServeHTTP(wrapped, r)
      logger.Println(
        "http:",
        "status", wrapped.status,
        "method", r.Method,
        "path", r.URL.EscapedPath(),
        "duration", time.Since(start),
      )
    }

    return http.HandlerFunc(fn)
  }
}



