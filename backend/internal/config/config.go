package config

import (
	"crypto/rand"
	"encoding/base64"
	"flag"
	"fmt"
	"strconv"
	"strings"
)

type Config struct {
	Host           string
	Port           string
	SqlitePath     string
	Secret         string
	SecretBytes    []byte
	MetricsEnabled bool
	MetricsPort    string
}

func (config *Config) LogSafeSummary() string {
	return fmt.Sprintf(
		"Host:'%s', Port:'%s', SqlitePath:'%s', secret:'[REDACTED]', MetricsEnabled:%v, MetricsPort:'%s'",
		config.Host,
		config.Port,
		config.SqlitePath,
		config.MetricsEnabled,
		config.MetricsPort,
	)
}

// MakeConfig loads the whole app configuration.
//
// There are no built-in defaults: every value must be provided through its
// environment variable or its command line flag. Flags take precedence over
// environment variables. When something is missing the returned error lists
// every value that still needs to be configured, so the app fails at startup
// instead of silently running with the wrong database, listener, or secret.
func MakeConfig(
	args []string,
	getenv func(string) string,
) (Config, error) {

	c := Config{}

	fs := flag.NewFlagSet("config", flag.ContinueOnError)
	host := fs.String("host", "", "Set the host")
	port := fs.String("port", "", "Set the port")
	sqlitePath := fs.String("sqlite_path", "", "Set the sqlite database path")
	secret := fs.String("secret", "", "Set the encryption secret")
	metricsPort := fs.String("metrics_port", "", "Set the prometheus exporter port")
	metricsEnabled := fs.Bool("metrics_enabled", false, "Enable prometheus metrics")

	var flagArgs []string
	if len(args) > 1 {
		flagArgs = args[1:]
	}
	if err := fs.Parse(flagArgs); err != nil {
		return c, fmt.Errorf("config: %w", err)
	}

	setFlags := make(map[string]bool)
	fs.Visit(func(f *flag.Flag) {
		setFlags[f.Name] = true
	})

	// resolve reads the value from the flag when it was provided, otherwise
	// from the environment. The bool result reports whether a usable value was
	// found. An explicitly empty flag value counts as missing.
	resolve := func(flagName, flagValue, envName string) (string, bool) {
		if setFlags[flagName] {
			value := strings.TrimSpace(flagValue)
			return value, value != ""
		}
		value := strings.TrimSpace(getenv(envName))
		return value, value != ""
	}

	var missing []string
	require := func(flagName, flagValue, envName string) string {
		value, ok := resolve(flagName, flagValue, envName)
		if !ok {
			missing = append(missing, envName)
		}
		return value
	}

	c.Host = require("host", *host, "HOST")
	c.Port = require("port", *port, "PORT")
	c.SqlitePath = require("sqlite_path", *sqlitePath, "SQLITE_PATH")
	c.Secret = require("secret", *secret, "SECRET")

	metricsEnabledRaw := strings.TrimSpace(getenv("METRICS_ENABLED"))
	if setFlags["metrics_enabled"] {
		metricsEnabledRaw = strconv.FormatBool(*metricsEnabled)
	}
	if metricsEnabledRaw == "" {
		missing = append(missing, "METRICS_ENABLED")
	}

	if len(missing) > 0 {
		return c, missingError(missing, "set the environment variable or the matching command line flag")
	}

	enabled, err := parseBool("METRICS_ENABLED", metricsEnabledRaw)
	if err != nil {
		return c, fmt.Errorf("config: %w", err)
	}
	c.MetricsEnabled = enabled

	if enabled {
		value, ok := resolve("metrics_port", *metricsPort, "METRICS_PORT")
		if !ok {
			return c, missingError(
				[]string{"METRICS_PORT"},
				"required when METRICS_ENABLED is true",
			)
		}
		c.MetricsPort = value
	}

	if err := validatePort("PORT", c.Port); err != nil {
		return c, fmt.Errorf("config: %w", err)
	}
	if enabled {
		if err := validatePort("METRICS_PORT", c.MetricsPort); err != nil {
			return c, fmt.Errorf("config: %w", err)
		}
	}

	// The secret must be the b64 string of 32 random bytes. There is
	// deliberately no generated fallback: a random secret on every restart
	// silently invalidates all existing sessions.
	data, err := base64.StdEncoding.DecodeString(c.Secret)
	if err != nil {
		return c, fmt.Errorf("config: SECRET is not a base64 string")
	}
	if len(data) != 32 {
		return c, fmt.Errorf("config: SECRET must decode to 32 bytes, got %d", len(data))
	}
	c.SecretBytes = data

	return c, nil
}

func missingError(missing []string, hint string) error {
	return fmt.Errorf(
		"config: missing required configuration: %s (%s)",
		strings.Join(missing, ", "),
		hint,
	)
}

func parseBool(name, value string) (bool, error) {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "true", "yes", "1":
		return true, nil
	case "false", "no", "0":
		return false, nil
	default:
		return false, fmt.Errorf("%s must be true or false, got %q", name, value)
	}
}

func validatePort(name, value string) error {
	port, err := strconv.Atoi(value)
	if err != nil || port < 1 || port > 65535 {
		return fmt.Errorf("%s must be a number between 1 and 65535, got %q", name, value)
	}
	return nil
}

// GenerateSecureRandomB64 generates a new random Secret.
func GenerateSecureRandomB64() (string, error) {
	randomBytes := make([]byte, 32)
	if _, err := rand.Read(randomBytes); err != nil {
		return "", fmt.Errorf("could not generate random secret: %w", err)
	}
	return base64.StdEncoding.EncodeToString(randomBytes), nil
}
