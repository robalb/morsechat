package main

import (
	"context"
	"fmt"
	"os"

	"github.com/robalb/morsechat/internal/config"
	"github.com/robalb/morsechat/internal/server"
)

/*
*
The entry point for our webserver.
All code is organized for maximal
testability, according to the sacred scriptures:
https://grafana.com/blog/2024/02/09/how-i-write-http-services-in-go-after-13-years/
*/
func main() {
	ctx := context.Background()

	// Load .env from the working directory (normally backend/) when present.
	// Real environment variables and command line flags keep precedence.
	if err := config.LoadDotEnv(".env"); err != nil {
		fmt.Fprintf(os.Stderr, "morsechat: %v\n", err)
		os.Exit(1)
	}

	if err := server.Run(ctx, os.Stdout, os.Stderr, os.Args, os.Getenv); err != nil {
		fmt.Fprintf(os.Stderr, "%s\n", err)
		os.Exit(1)
	}
}
