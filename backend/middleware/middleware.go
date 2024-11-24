package middleware

import (
	"net/http"
	"time"
  "log"
)

type Middleware func (http.Handler) http.Handler

/**
* Nest middlewares with a single function call
*/
func CreateStack(xs ...Middleware) Middleware {
  return func (next http.Handler) http.Handler {
    for i := len(xs)-1; i >= 0; i-- {
      x := xs[i]
      next = x(next)
    }
    return next
  }
}


func Logging(next http.Handler) http.Handler {
  return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
    start := time.Now()
    next.ServeHTTP(w, r)
    log.Printf("asdasdasd %v", start)
  })
}
