package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadDotEnvLoadsValues(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, ".env")
	content := `# comment

MORSECHAT_DOTENV_NEW=value
MORSECHAT_DOTENV_QUOTED="hello world"
`
	if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
		t.Fatalf("could not write test env file: %v", err)
	}

	unsetEnv(t, "MORSECHAT_DOTENV_NEW")
	unsetEnv(t, "MORSECHAT_DOTENV_QUOTED")

	if err := LoadDotEnv(path); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if got := os.Getenv("MORSECHAT_DOTENV_NEW"); got != "value" {
		t.Errorf("expected the value from the file, got %q", got)
	}
	if got := os.Getenv("MORSECHAT_DOTENV_QUOTED"); got != "hello world" {
		t.Errorf("expected the quoted value from the file, got %q", got)
	}
}

func TestLoadDotEnvDoesNotOverrideExistingValues(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, ".env")
	if err := os.WriteFile(path, []byte("MORSECHAT_DOTENV_EXISTING=from-file\n"), 0o600); err != nil {
		t.Fatalf("could not write test env file: %v", err)
	}

	t.Setenv("MORSECHAT_DOTENV_EXISTING", "from-process")

	if err := LoadDotEnv(path); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if got := os.Getenv("MORSECHAT_DOTENV_EXISTING"); got != "from-process" {
		t.Errorf("expected the process value to win, got %q", got)
	}
}

func TestLoadDotEnvMissingFileIsNotAnError(t *testing.T) {
	err := LoadDotEnv(filepath.Join(t.TempDir(), "missing.env"))
	if err != nil {
		t.Fatalf("expected no error for a missing file, got %v", err)
	}
}

func TestLoadDotEnvRejectsMalformedFile(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, ".env")
	if err := os.WriteFile(path, []byte("NOT_A_PAIR\n"), 0o600); err != nil {
		t.Fatalf("could not write test env file: %v", err)
	}

	if err := LoadDotEnv(path); err == nil {
		t.Fatal("expected an error for a malformed file")
	}
}

func unsetEnv(t *testing.T, key string) {
	t.Helper()
	previous, existed := os.LookupEnv(key)
	if err := os.Unsetenv(key); err != nil {
		t.Fatalf("could not unset %s: %v", key, err)
	}
	t.Cleanup(func() {
		if existed {
			_ = os.Setenv(key, previous)
			return
		}
		_ = os.Unsetenv(key)
	})
}
