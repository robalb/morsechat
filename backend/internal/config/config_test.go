package config

import (
	"encoding/base64"
	"strings"
	"testing"
)

func validSecret() string {
	return base64.StdEncoding.EncodeToString(make([]byte, 32))
}

func envFunc(values map[string]string) func(string) string {
	return func(key string) string {
		return values[key]
	}
}

func fullEnv() map[string]string {
	return map[string]string{
		"HOST":            "127.0.0.1",
		"PORT":            "8080",
		"SQLITE_PATH":     "db.sqlite",
		"SECRET":          validSecret(),
		"METRICS_ENABLED": "false",
	}
}

func TestMakeConfigRequiresEveryValue(t *testing.T) {
	_, err := MakeConfig([]string{"morsechat"}, envFunc(nil))
	if err == nil {
		t.Fatal("expected an error when no configuration is provided")
	}

	for _, name := range []string{
		"HOST",
		"PORT",
		"SQLITE_PATH",
		"SECRET",
		"METRICS_ENABLED",
	} {
		if !strings.Contains(err.Error(), name) {
			t.Errorf("expected the error to mention %s, got %q", name, err)
		}
	}
}

func TestMakeConfigDoesNotInventDefaults(t *testing.T) {
	// Only the secret is provided. Everything else must be reported as
	// missing instead of silently falling back to a default value.
	_, err := MakeConfig([]string{"morsechat"}, envFunc(map[string]string{
		"SECRET": validSecret(),
	}))
	if err == nil {
		t.Fatal("expected an error for the missing values")
	}
	if strings.Contains(err.Error(), "SECRET") {
		t.Errorf("SECRET was provided, but the error mentions it: %q", err)
	}
	for _, name := range []string{"HOST", "PORT", "SQLITE_PATH", "METRICS_ENABLED"} {
		if !strings.Contains(err.Error(), name) {
			t.Errorf("expected the error to mention %s, got %q", name, err)
		}
	}
}

func TestMakeConfigFromEnv(t *testing.T) {
	c, err := MakeConfig([]string{"morsechat"}, envFunc(fullEnv()))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if c.Host != "127.0.0.1" {
		t.Errorf("expected host from env, got %q", c.Host)
	}
	if c.Port != "8080" {
		t.Errorf("expected port from env, got %q", c.Port)
	}
	if c.SqlitePath != "db.sqlite" {
		t.Errorf("expected sqlite path from env, got %q", c.SqlitePath)
	}
	if c.MetricsEnabled {
		t.Error("expected metrics to be disabled")
	}
	if c.MetricsPort != "" {
		t.Errorf("expected no metrics port when metrics are disabled, got %q", c.MetricsPort)
	}
	if len(c.SecretBytes) != 32 {
		t.Errorf("expected a 32 byte secret, got %d", len(c.SecretBytes))
	}
}

func TestMakeConfigFlagsOverrideEnv(t *testing.T) {
	secret := validSecret()
	args := []string{
		"morsechat",
		"--host", "0.0.0.0",
		"--port", "4321",
		"--sqlite_path", "flag.sqlite",
		"--secret", secret,
		"--metrics_enabled=true",
		"--metrics_port", "9091",
	}

	c, err := MakeConfig(args, envFunc(fullEnv()))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if c.Host != "0.0.0.0" {
		t.Errorf("expected host from flag, got %q", c.Host)
	}
	if c.Port != "4321" {
		t.Errorf("expected port from flag, got %q", c.Port)
	}
	if c.SqlitePath != "flag.sqlite" {
		t.Errorf("expected sqlite path from flag, got %q", c.SqlitePath)
	}
	if !c.MetricsEnabled {
		t.Error("expected metrics to be enabled from flag")
	}
	if c.MetricsPort != "9091" {
		t.Errorf("expected metrics port from flag, got %q", c.MetricsPort)
	}
	if c.Secret != secret {
		t.Error("expected secret from flag")
	}
}

func TestMakeConfigBooleanFlagOverridesEnv(t *testing.T) {
	values := fullEnv()
	values["METRICS_ENABLED"] = "true"
	values["METRICS_PORT"] = "9090"

	c, err := MakeConfig(
		[]string{"morsechat", "--metrics_enabled=false"},
		envFunc(values),
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if c.MetricsEnabled {
		t.Error("expected the explicit false flag to win over the environment")
	}
	if c.MetricsPort != "" {
		t.Errorf("expected no metrics port when metrics are disabled, got %q", c.MetricsPort)
	}
}

func TestMakeConfigMetricsPortFromEnv(t *testing.T) {
	values := fullEnv()
	values["METRICS_ENABLED"] = "true"
	values["METRICS_PORT"] = "9090"

	c, err := MakeConfig([]string{"morsechat"}, envFunc(values))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !c.MetricsEnabled {
		t.Error("expected metrics to be enabled")
	}
	if c.MetricsPort != "9090" {
		t.Errorf("expected metrics port from env, got %q", c.MetricsPort)
	}
}

func TestMakeConfigRequiresMetricsPortWhenEnabled(t *testing.T) {
	values := fullEnv()
	values["METRICS_ENABLED"] = "true"

	_, err := MakeConfig([]string{"morsechat"}, envFunc(values))
	if err == nil {
		t.Fatal("expected an error for the missing metrics port")
	}
	if !strings.Contains(err.Error(), "METRICS_PORT") {
		t.Errorf("expected the error to mention METRICS_PORT, got %q", err)
	}
}

func TestMakeConfigEmptyFlagCountsAsMissing(t *testing.T) {
	_, err := MakeConfig(
		[]string{"morsechat", "--host="},
		envFunc(fullEnv()),
	)
	if err == nil {
		t.Fatal("expected an error for the empty host flag")
	}
	if !strings.Contains(err.Error(), "HOST") {
		t.Errorf("expected the error to mention HOST, got %q", err)
	}
}

func TestMakeConfigRejectsInvalidValues(t *testing.T) {
	tests := []struct {
		name   string
		mutate func(map[string]string)
		want   string
	}{
		{
			name: "secret is not base64",
			mutate: func(values map[string]string) {
				values["SECRET"] = "not base64!"
			},
			want: "base64",
		},
		{
			name: "secret is too short",
			mutate: func(values map[string]string) {
				values["SECRET"] = base64.StdEncoding.EncodeToString(make([]byte, 16))
			},
			want: "32 bytes",
		},
		{
			name: "port is not a number",
			mutate: func(values map[string]string) {
				values["PORT"] = "http"
			},
			want: "PORT",
		},
		{
			name: "port is out of range",
			mutate: func(values map[string]string) {
				values["PORT"] = "70000"
			},
			want: "PORT",
		},
		{
			name: "metrics enabled is not a boolean",
			mutate: func(values map[string]string) {
				values["METRICS_ENABLED"] = "sometimes"
			},
			want: "METRICS_ENABLED",
		},
		{
			name: "metrics port is out of range",
			mutate: func(values map[string]string) {
				values["METRICS_ENABLED"] = "true"
				values["METRICS_PORT"] = "0"
			},
			want: "METRICS_PORT",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			values := fullEnv()
			tt.mutate(values)

			_, err := MakeConfig([]string{"morsechat"}, envFunc(values))
			if err == nil {
				t.Fatal("expected an error")
			}
			if !strings.Contains(err.Error(), tt.want) {
				t.Errorf("expected the error to mention %q, got %q", tt.want, err)
			}
		})
	}
}

func TestMakeConfigAcceptsBooleanAliases(t *testing.T) {
	for _, value := range []string{"true", "yes", "1"} {
		values := fullEnv()
		values["METRICS_ENABLED"] = value
		values["METRICS_PORT"] = "9090"

		c, err := MakeConfig([]string{"morsechat"}, envFunc(values))
		if err != nil {
			t.Fatalf("%q: unexpected error: %v", value, err)
		}
		if !c.MetricsEnabled {
			t.Errorf("%q: expected metrics to be enabled", value)
		}
	}

	for _, value := range []string{"false", "no", "0"} {
		values := fullEnv()
		values["METRICS_ENABLED"] = value

		c, err := MakeConfig([]string{"morsechat"}, envFunc(values))
		if err != nil {
			t.Fatalf("%q: unexpected error: %v", value, err)
		}
		if c.MetricsEnabled {
			t.Errorf("%q: expected metrics to be disabled", value)
		}
	}
}

func TestLogSafeSummaryRedactsTheSecret(t *testing.T) {
	c, err := MakeConfig([]string{"morsechat"}, envFunc(fullEnv()))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	summary := c.LogSafeSummary()
	if strings.Contains(summary, c.Secret) {
		t.Errorf("summary leaks the secret: %q", summary)
	}
	if !strings.Contains(summary, "[REDACTED]") {
		t.Errorf("expected the secret to be redacted, got %q", summary)
	}
}
