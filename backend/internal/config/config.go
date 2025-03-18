package config

import (
	"crypto/rand"
	"encoding/base64"
	"flag"
	"fmt"
	"strings"
)

type Config struct {
	Host       string
	Port       string
	SqlitePath string
  Secret     string
  SecretBytes     []byte
  MetricsEnabled bool
  MetricsPort string
}


func (config *Config) LogSafeSummary() string{
  censoredSecret := config.Secret[0:5] + "[CENSORED]"
  return fmt.Sprintf(
    "Host:'%s', Port:'%s', SqlitePath:'%s', secret:'%s', MetricsEnabled:%v, MetricsPort:'%s'", 
    config.Host,
    config.Port,
    config.SqlitePath,
    censoredSecret,
    config.MetricsEnabled,
    config.MetricsPort,
    )
}


// Load Configuration for the whole app, using command line args or
// env vars as a source.
//   - what you set via env var will override the default value.
//   - What you set via command line will override the default value
//     or what you set via env var.
//
// Note: thie configuration object is set at the app startup, and is 
//       static and immutable. It should be passed around by value.
func MakeConfig(
	args []string,
	getenv func(string) string,
) (Config, error) {

	c := defaultConfig()
  parseEnv(&c, getenv)
  parseCmdFlags(&c, args)

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
    MetricsEnabled: true,
    MetricsPort: "8081",
	}
}


func parseEnv(
  c *Config,
  getenv func(string) string,
) {
	if host := getenv("HOST"); host != "" {
		c.Host = host
	}
	if port := getenv("PORT"); port != "" {
		c.Port = port
	}
	if sqlitePath := getenv("SQLITE_PATH"); sqlitePath != "" {
		c.SqlitePath = sqlitePath
	}
	if secret := getenv("SECRET"); secret != "" {
		c.Secret = secret
	}
	if metricsPort := getenv("METRICS_PORT"); metricsPort != "" {
		c.MetricsPort = metricsPort
	}

	if metricsEnabled := getenv("METRICS_ENABLED"); metricsEnabled != "" {
    boolStr := strings.ToLower(metricsEnabled)
    c.MetricsEnabled = (
      boolStr == "true" ||
      boolStr == "yes" ||
      boolStr == "1")
  }
}


func parseCmdFlags(
  c *Config,
	args []string,
) {
	fs := flag.NewFlagSet("config", flag.ContinueOnError)
	host := fs.String("host", c.Host, "Set the host")
	port := fs.String("port", c.Port, "Set the port")
	sqlitePath := fs.String("sqlite_path", c.SqlitePath, "Set the sqlite database path")
	secret := fs.String("secret", c.Secret, "Set the encryption secret")
	metricsPort := fs.String("metrics_port", c.MetricsPort, "Set the prometheus exporter port")
	metricsEnabled := fs.Bool("metrics_enabled", c.MetricsEnabled, "Enable prometheus metrics")

	_ = fs.Parse(args[1:])

	c.Host = *host
	c.Port = *port
	c.SqlitePath = *sqlitePath
	c.Secret = *secret
	c.MetricsPort = *metricsPort
  c.MetricsEnabled = *metricsEnabled
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
