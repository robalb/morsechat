package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"time"
  "context"
  "io"
  "os"
  "os/signal"
  "sync"
)

var addr = flag.String("addr", ":8080", "http service address")

func serveHome(w http.ResponseWriter, r *http.Request) {
	log.Println(r.URL)
	if r.URL.Path != "/" {
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	http.ServeFile(w, r, "home.html")
}

func serveTest(w http.ResponseWriter, r *http.Request) {
	tr := &http.Transport{
		IdleConnTimeout:    1 * time.Second,
		DisableCompression: true,
	}
	client := &http.Client{Transport: tr}
	resp, err := client.Get("https://halb.it")
	if err != nil {
		log.Println("err")
		log.Println(err)
	} else {
		log.Println(resp)
	}
}

func serveTestCtx(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	select {
	case <-ctx.Done():
    log.Println("ctx done, abrupt end. reason:")
		log.Println(ctx.Err())
		http.Error(w, ctx.Err().Error(), http.StatusInternalServerError)
	case <-time.After(4 * time.Second):
		log.Println("10s elapsed")
    fmt.Fprintf(w, "10s elapsed")
	}

}

func run(ctx context.Context, w io.Writer, args []string) error {
	ctx, cancel := signal.NotifyContext(ctx, os.Interrupt)
	defer cancel()

  httpServer := &http.Server{
    Addr:   ":8080",
    // Handler: srv, //if not set, jj
  }

  //? logger config?

	log.Println("starting... ")
	flag.Parse()
	hub := newHub()
	go hub.run()

	http.HandleFunc("/", serveHome)
	http.HandleFunc("/test/", serveTest)
	http.HandleFunc("/testctx/", serveTestCtx)
	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		serveWs(hub, w, r)
	})

  //--------------------
  // Start the webserver
  //--------------------
  go func() {
    log.Printf("listening on %s\n", httpServer.Addr)
    if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
      fmt.Fprintf(os.Stderr, "error listening and serving: %s\n", err)
    }
  }()

  //--------------------
  // Graceful shutdown
  //--------------------
  var wg sync.WaitGroup
  wg.Add(1)
  // Webserver graceful shutdown
  //TODO: close websockets. Shutdown does not close websckets
  go func() {
    defer wg.Done()
    <-ctx.Done()
    log.Println("Gracefully shutting down...")
    shutdownCtx := context.Background()
    shutdownCtx, cancel := context.WithTimeout(shutdownCtx, 10 * time.Second)
    defer cancel()
    if err := httpServer.Shutdown(shutdownCtx); err != nil {
      fmt.Fprintf(os.Stderr, "error shutting down http server: %s\n", err)
    }
  }()
  wg.Wait()
  return nil
}

/**
The entry point for our webserver.

All code is organized for maximal
testability, according to the sacret scriptures: 
https://grafana.com/blog/2024/02/09/how-i-write-http-services-in-go-after-13-years/
*/
func main() {
	ctx := context.Background()
	if err := run(ctx, os.Stdout, os.Args); err != nil {
		fmt.Fprintf(os.Stderr, "%s\n", err)
		os.Exit(1)
	}
}
