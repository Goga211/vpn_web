package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadDotEnvDoesNotOverrideExistingEnv(t *testing.T) {
	t.Setenv("VPN_WEB_TEST_KEEP", "from-shell")

	path := filepath.Join(t.TempDir(), ".env")
	if err := os.WriteFile(path, []byte(`
VPN_WEB_TEST_KEEP=from-file
VPN_WEB_TEST_PLAIN=value
VPN_WEB_TEST_QUOTED="hello world"
VPN_WEB_TEST_SINGLE='secret value'
`), 0o600); err != nil {
		t.Fatalf("write env file: %v", err)
	}

	if err := loadDotEnv(path); err != nil {
		t.Fatalf("loadDotEnv() error = %v", err)
	}

	if got := os.Getenv("VPN_WEB_TEST_KEEP"); got != "from-shell" {
		t.Fatalf("existing env was overwritten: %q", got)
	}
	if got := os.Getenv("VPN_WEB_TEST_PLAIN"); got != "value" {
		t.Fatalf("plain env = %q", got)
	}
	if got := os.Getenv("VPN_WEB_TEST_QUOTED"); got != "hello world" {
		t.Fatalf("quoted env = %q", got)
	}
	if got := os.Getenv("VPN_WEB_TEST_SINGLE"); got != "secret value" {
		t.Fatalf("single quoted env = %q", got)
	}
}

func TestGetCSVEnvTrimsEmptyValues(t *testing.T) {
	t.Setenv("VPN_WEB_TEST_CSV", " first,second ,, third ")

	got := getCSVEnv("VPN_WEB_TEST_CSV")
	want := []string{"first", "second", "third"}
	if len(got) != len(want) {
		t.Fatalf("csv len = %d, want %d; values = %#v", len(got), len(want), got)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("csv[%d] = %q, want %q; values = %#v", i, got[i], want[i], got)
		}
	}
}
