package checkout

import (
	"os"
	"path/filepath"
	"testing"
)

func TestStorePersistsCheckouts(t *testing.T) {
	dir := t.TempDir()
	store, err := NewStore(dir)
	if err != nil {
		t.Fatalf("NewStore() error = %v", err)
	}

	created, err := store.Create(CreateInput{
		PlanID:  "quarter",
		Contact: "@client",
	})
	if err != nil {
		t.Fatalf("Create() error = %v", err)
	}
	if created.Status != StatusPaidStub {
		t.Fatalf("created status = %q, want %q", created.Status, StatusPaidStub)
	}

	reloaded, err := NewStore(dir)
	if err != nil {
		t.Fatalf("reload NewStore() error = %v", err)
	}
	got, ok := reloaded.Get(created.ID)
	if !ok {
		t.Fatalf("reloaded checkout %q not found", created.ID)
	}
	if got.PlanID != "quarter" || got.Contact != "@client" {
		t.Fatalf("reloaded checkout = %+v", got)
	}

	stat, err := os.Stat(filepath.Join(dir, "checkouts.json"))
	if err != nil {
		t.Fatalf("stat checkouts file: %v", err)
	}
	if gotMode := stat.Mode().Perm(); gotMode != 0o600 {
		t.Fatalf("checkouts file mode = %o, want 600", gotMode)
	}
}

func TestCreateRejectsUnknownPlan(t *testing.T) {
	store, err := NewStore(t.TempDir())
	if err != nil {
		t.Fatalf("NewStore() error = %v", err)
	}

	if _, err := store.Create(CreateInput{PlanID: "missing", Contact: "@client"}); err == nil {
		t.Fatal("Create() error = nil, want error")
	}
}
