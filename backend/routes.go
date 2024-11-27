package main

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
)


func AddRoutes(
  rootMux *chi.Mux,
  logger *log.Logger,
  config Config,
  hub *Hub,
  /* Put here all the dependencies for middlewares and routers */
){

  rootMux.Get("/", serveHome)
  rootMux.Get("/ws", func(w http.ResponseWriter, r *http.Request) {
    serveWs(hub, w, r)
    })

  v1 := chi.NewRouter()
  rootMux.Mount("/api/v1", v1)

  v1.Route("/test", func(r chi.Router) {
    //r.Use(middleware.somemiddleware)
    r.Get("/time", serveTestCtx)
    r.Get("/ping", serveTest)
  })

}



//TODO: move to dedicated file anything below this line
//---------

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

