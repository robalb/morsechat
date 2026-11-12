package config

import (
	"errors"
	"fmt"
	"os"

	"github.com/joho/godotenv"
)

// LoadDotEnv loads key=value pairs from path into the process environment.
//
// Existing environment variables are never overridden, so values set by the
// process environment keep precedence over the file. A missing file is not an
// error: configuration may be provided entirely through the environment or
// command line flags.
func LoadDotEnv(path string) error {
	if err := godotenv.Load(path); err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return nil
		}
		return fmt.Errorf("could not load %s: %w", path, err)
	}
	return nil
}
