package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestDefaultSqlitePathPrefersEnv(t *testing.T) {
	got := defaultSqlitePath(func(key string) string {
		if key == "SQLITE_PATH" {
			return "/custom/morsechat.sqlite"
		}
		return ""
	})
	if got != "/custom/morsechat.sqlite" {
		t.Fatalf("expected SQLITE_PATH value, got %q", got)
	}
}

func TestDefaultSqlitePathUsesModuleRoot(t *testing.T) {
	root := t.TempDir()
	if err := os.WriteFile(filepath.Join(root, "go.mod"), []byte("module example\n"), 0o644); err != nil {
		t.Fatalf("could not create go.mod: %v", err)
	}
	nested := filepath.Join(root, "cmd", "admin")
	if err := os.MkdirAll(nested, 0o755); err != nil {
		t.Fatalf("could not create nested directory: %v", err)
	}
	chdir(t, nested)

	got := defaultSqlitePath(func(string) string { return "" })
	want := filepath.Join(root, "db.sqlite")
	if got != want {
		t.Fatalf("expected module-root database %q, got %q", want, got)
	}
}

func TestDefaultSqlitePathFallsBackToCwd(t *testing.T) {
	dir := t.TempDir()
	chdir(t, dir)

	got := defaultSqlitePath(func(string) string { return "" })
	if got != "db.sqlite" {
		t.Fatalf("expected relative db.sqlite fallback, got %q", got)
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
