package httpx

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestSecurityHeadersApplied(t *testing.T) {
	handler := SecurityHeaders(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/", nil))

	csp := rec.Header().Get("Content-Security-Policy")
	if csp == "" {
		t.Fatal("Content-Security-Policy header is empty")
	}
	// CSP должен пускать SDK Telegram и встраивание Mini App в веб-Telegram.
	if !strings.Contains(csp, "script-src 'self' https://telegram.org") {
		t.Fatalf("CSP does not allow Telegram SDK: %q", csp)
	}
	if !strings.Contains(csp, "frame-ancestors https://web.telegram.org") {
		t.Fatalf("CSP does not allow Telegram framing: %q", csp)
	}
	// X-Frame-Options не должен стоять — он конфликтует с frame-ancestors.
	if got := rec.Header().Get("X-Frame-Options"); got != "" {
		t.Fatalf("X-Frame-Options = %q, want empty (managed via CSP)", got)
	}
	for _, header := range []string{
		"Strict-Transport-Security",
		"X-Content-Type-Options",
		"Referrer-Policy",
		"Permissions-Policy",
	} {
		if rec.Header().Get(header) == "" {
			t.Fatalf("%s header is empty", header)
		}
	}
}
