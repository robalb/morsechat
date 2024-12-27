package config

import (
	"crypto/rand"
	"encoding/base64"
	"flag"
	"fmt"
)

type Config struct {
	Host       string
	Port       string
	SqlitePath string
  Secret     string
  SecretBytes     []byte
}

func defaultConfig() Config {
	return Config{
		Host:       "",
		Port:       "8080",
		SqlitePath: "db.sqlite",
    //Secret must be the b64 string of 32 random bytes
    // It's better to have a new random secret on every app launch causing
    // bugs when the backend reloads
    // than to have a hardcoded default value causing security issues
    Secret: GenerateSecureRandomB64(),
	}
}

// Generate a random Secret. Used when a secret is not provided
func GenerateSecureRandomB64() string {
	randomBytes := make([]byte, 32)
	_, err := rand.Read(randomBytes)
	if err != nil {
		return ""
	}
	randomB64 := base64.StdEncoding.EncodeToString(randomBytes)
	return randomB64
}

// Load Configuration for the whole app, using command line args or
// env vars as a source.
//   - what you set via env var will override the default value.
//   - What you set via command line will override the default value
//     or what you set via env var.
func MakeConfig(
	args []string,
	getenv func(string) string,
) (Config, error) {

	c := defaultConfig()

	if hostEnv := getenv("HOST"); hostEnv != "" {
		c.Host = hostEnv
	}
	if portEnv := getenv("PORT"); portEnv != "" {
		c.Port = portEnv
	}
	if sqlitePath := getenv("SQLITE_PATH"); sqlitePath != "" {
		c.SqlitePath = sqlitePath
	}
	if SecretEnv := getenv("SECRET"); SecretEnv != "" {
		c.Secret = SecretEnv
	}

	fs := flag.NewFlagSet("config", flag.ContinueOnError)
	host := fs.String("host", c.Host, "Set the host")
	port := fs.String("port", c.Port, "Set the port")
	sqlitePath := fs.String("sqlite_path", c.SqlitePath, "Set the sqlite database path")
	secret := fs.String("secret", c.Secret, "Set the encryption secret")
	_ = fs.Parse(args[1:])

	// Override config with command-line arguments if provided
	if *host != "" {
		c.Host = *host
	}
	if *port != "" {
		c.Port = *port
	}
	if *sqlitePath != "" {
		c.SqlitePath = *sqlitePath
	}
	if *secret != "" {
		c.Secret = *secret
	}

  //data validation
  data, err := base64.StdEncoding.DecodeString(c.Secret)
  if err != nil{
    return c, fmt.Errorf("Config error: Secret is not a base64 string")
  }
  if len(data) != 32{
    return c, fmt.Errorf("Config error: Secret is not 32 bytes long after b64 decoding")
  }
  c.SecretBytes = data


	return c, nil
}
