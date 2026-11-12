package main

import (
	"bytes"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func noEnv(string) string { return "" }

func TestResolveSqlitePath(t *testing.T) {
	tests := []struct {
		name    string
		flag    string
		env     string
		want    string
		wantErr string
	}{
		{
			name: "flag wins over the environment",
			flag: "flag.sqlite",
			env:  "env.sqlite",
			want: "flag.sqlite",
		},
		{
			name: "environment is used when the flag is empty",
			env:  "env.sqlite",
			want: "env.sqlite",
		},
		{
			name: "surrounding whitespace is ignored",
			flag: "  ",
			env:  "  env.sqlite  ",
			want: "env.sqlite",
		},
		{
			name:    "nothing configured is an error",
			wantErr: "SQLITE_PATH",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := resolveSqlitePath(tt.flag, func(key string) string {
				if key == "SQLITE_PATH" {
					return tt.env
				}
				return ""
			})

			if tt.wantErr != "" {
				if err == nil {
					t.Fatalf("expected an error, got path %q", got)
				}
				if !strings.Contains(err.Error(), tt.wantErr) {
					t.Fatalf("expected error to mention %q, got %q", tt.wantErr, err)
				}
				if !strings.Contains(err.Error(), "-sqlite_path") {
					t.Fatalf("expected error to mention -sqlite_path, got %q", err)
				}
				return
			}

			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got != tt.want {
				t.Fatalf("expected %q, got %q", tt.want, got)
			}
		})
	}
}

func TestRunRequiresConfiguredDatabase(t *testing.T) {
	dir := t.TempDir()
	chdir(t, dir)

	var stdout, stderr bytes.Buffer
	code := run(
		[]string{"-username", "alice"},
		noEnv,
		&stdout,
		&stderr,
	)

	if code != 2 {
		t.Fatalf("expected exit code 2, got %d", code)
	}
	if !strings.Contains(stderr.String(), "SQLITE_PATH") {
		t.Fatalf("expected the error to mention SQLITE_PATH, got %q", stderr.String())
	}
	if stdout.Len() != 0 {
		t.Fatalf("expected no output on stdout, got %q", stdout.String())
	}
	// The command must not create a database when it is not configured.
	if _, err := os.Stat(filepath.Join(dir, "db.sqlite")); !os.IsNotExist(err) {
		t.Fatalf("command created an unconfigured database: %v", err)
	}
}

func TestRunRequiresUsername(t *testing.T) {
	var stdout, stderr bytes.Buffer
	code := run(
		nil,
		func(key string) string {
			if key == "SQLITE_PATH" {
				return "unused.sqlite"
			}
			return ""
		},
		&stdout,
		&stderr,
	)

	if code != 2 {
		t.Fatalf("expected exit code 2, got %d", code)
	}
	if !strings.Contains(stderr.String(), "-username is required") {
		t.Fatalf("expected a username error, got %q", stderr.String())
	}
}

func TestRunRejectsMissingDatabaseFile(t *testing.T) {
	missing := filepath.Join(t.TempDir(), "missing.sqlite")

	var stdout, stderr bytes.Buffer
	code := run(
		[]string{"-username", "alice", "-sqlite_path", missing},
		noEnv,
		&stdout,
		&stderr,
	)

	if code != 1 {
		t.Fatalf("expected exit code 1, got %d", code)
	}
	if !strings.Contains(stderr.String(), "does not exist") {
		t.Fatalf("expected a missing database error, got %q", stderr.String())
	}
	if _, err := os.Stat(missing); !os.IsNotExist(err) {
		t.Fatalf("command created the missing database: %v", err)
	}
}

func TestRunRejectsDirectoryAsDatabase(t *testing.T) {
	dir := t.TempDir()

	var stdout, stderr bytes.Buffer
	code := run(
		[]string{"-username", "alice", "-sqlite_path", dir},
		noEnv,
		&stdout,
		&stderr,
	)

	if code != 1 {
		t.Fatalf("expected exit code 1, got %d", code)
	}
	if !strings.Contains(stderr.String(), "is a directory") {
		t.Fatalf("expected a directory error, got %q", stderr.String())
	}
}

func TestRunRejectsUnknownFlag(t *testing.T) {
	var stdout, stderr bytes.Buffer
	code := run([]string{"-nope"}, noEnv, &stdout, &stderr)

	if code != 2 {
		t.Fatalf("expected exit code 2, got %d", code)
	}
}

func TestRunHelpExitsSuccessfully(t *testing.T) {
	var stdout, stderr bytes.Buffer
	code := run([]string{"-h"}, noEnv, &stdout, &stderr)

	if code != 0 {
		t.Fatalf("expected exit code 0, got %d", code)
	}
	if !strings.Contains(stderr.String(), "Usage of admin") {
		t.Fatalf("expected usage output, got %q", stderr.String())
	}
}

func chdir(t *testing.T, dir string) {
	t.Helper()
	previous, err := os.Getwd()
	if err != nil {
		t.Fatalf("could not read working directory: %v", err)
	}
	if err := os.Chdir(dir); err != nil {
		t.Fatalf("could not change working directory: %v", err)
	}
	t.Cleanup(func() {
		if err := os.Chdir(previous); err != nil {
			t.Fatalf("could not restore working directory: %v", err)
		}
	})
}
