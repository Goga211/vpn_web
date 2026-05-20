package remnawave

import (
	"strings"
	"testing"
)

func TestSuggestedUsernameIsPanelSafe(t *testing.T) {
	username := SuggestedUsername("ord_ABC 123!@# very-long-contact-name")

	if len(username) < 3 || len(username) > 36 {
		t.Fatalf("username length = %d, username = %q", len(username), username)
	}
	for _, r := range username {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '_' || r == '-' {
			continue
		}
		t.Fatalf("username contains invalid rune %q in %q", r, username)
	}
	if !strings.HasPrefix(username, "ord_abc") {
		t.Fatalf("username = %q, want sanitized seed prefix", username)
	}
}
