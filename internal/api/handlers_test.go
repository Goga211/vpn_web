package api

import (
	"bytes"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"vpn_web/internal/checkout"
	"vpn_web/internal/config"
	"vpn_web/internal/remnawave"
)

func TestCheckoutRequiresConfiguredRemnawave(t *testing.T) {
	store, err := checkout.NewStore(t.TempDir())
	if err != nil {
		t.Fatalf("NewStore() error = %v", err)
	}
	remna := remnawave.New(remnawave.Config{})
	server := NewServer(
		config.Config{CheckoutEnabled: true, BrandName: "TestVPN"},
		checkout.NewService(store, remna, checkout.ServiceConfig{}),
		slog.New(slog.NewTextHandler(bytes.NewBuffer(nil), nil)),
	)

	body := bytes.NewBufferString(`{"planId":"quarter","telegram":"@client","consent":true}`)
	req := httptest.NewRequest(http.MethodPost, "/api/checkout", body)
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	server.Routes().ServeHTTP(rec, req)

	if rec.Code != http.StatusFailedDependency {
		t.Fatalf("status = %d, want %d; body = %s", rec.Code, http.StatusFailedDependency, rec.Body.String())
	}

	var payload struct {
		Checkout checkout.Checkout `json:"checkout"`
		Error    struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if payload.Error.Code != "remnawave_not_configured" {
		t.Fatalf("error code = %q", payload.Error.Code)
	}
	if payload.Checkout.Status != checkout.StatusFailed {
		t.Fatalf("checkout status = %q, want %q", payload.Checkout.Status, checkout.StatusFailed)
	}
	if bytes.Contains(rec.Body.Bytes(), []byte("@client")) {
		t.Fatalf("response leaks user contact: %s", rec.Body.String())
	}
}

func TestCheckoutProvisionsUserThroughRemnawave(t *testing.T) {
	var sawCreateUser bool
	remna := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/api/auth/login":
			if r.Method != http.MethodPost {
				t.Fatalf("login method = %s", r.Method)
			}
			writeTestJSON(w, map[string]any{
				"response": map[string]string{"accessToken": "test-token"},
			})
		case "/api/users":
			if r.Method != http.MethodPost {
				t.Fatalf("create user method = %s", r.Method)
			}
			if got := r.Header.Get("Authorization"); got != "Bearer test-token" {
				t.Fatalf("Authorization = %q", got)
			}
			var req remnawave.CreateUserRequest
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				t.Fatalf("decode create user request: %v", err)
			}
			if req.Username == "" || req.ExpireAt == "" || req.Tag != "WEB" {
				t.Fatalf("create user request = %+v", req)
			}
			sawCreateUser = true
			writeTestJSON(w, map[string]any{
				"response": map[string]any{
					"uuid":            "11111111-1111-1111-1111-111111111111",
					"shortUuid":       "short-user",
					"username":        req.Username,
					"status":          "ACTIVE",
					"expireAt":        req.ExpireAt,
					"subscriptionUrl": "https://subs.example/short-user",
				},
			})
		default:
			http.NotFound(w, r)
		}
	}))
	defer remna.Close()

	store, err := checkout.NewStore(t.TempDir())
	if err != nil {
		t.Fatalf("NewStore() error = %v", err)
	}
	remnawaveClient := remnawave.New(remnawave.Config{BaseURL: remna.URL, Username: "admin", Password: "secret"})
	server := NewServer(
		config.Config{CheckoutEnabled: true, BrandName: "TestVPN", RemnawaveTag: "WEB"},
		checkout.NewService(store, remnawaveClient, checkout.ServiceConfig{RemnawaveTag: "WEB"}),
		slog.New(slog.NewTextHandler(bytes.NewBuffer(nil), nil)),
	)

	body := bytes.NewBufferString(`{"planId":"quarter","telegram":"@client","consent":true}`)
	req := httptest.NewRequest(http.MethodPost, "/api/checkout", body)
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	server.Routes().ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("status = %d, want %d; body = %s", rec.Code, http.StatusCreated, rec.Body.String())
	}
	if !sawCreateUser {
		t.Fatal("Remnawave /api/users was not called")
	}

	var payload struct {
		Checkout checkout.Checkout `json:"checkout"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if payload.Checkout.Status != checkout.StatusProvisioned {
		t.Fatalf("checkout status = %q, want %q", payload.Checkout.Status, checkout.StatusProvisioned)
	}
	if payload.Checkout.SubscriptionURL != "https://subs.example/short-user" {
		t.Fatalf("subscription URL = %q", payload.Checkout.SubscriptionURL)
	}
	if bytes.Contains(rec.Body.Bytes(), []byte("@client")) {
		t.Fatalf("response leaks user contact: %s", rec.Body.String())
	}
}

func TestCheckoutRejectsLongContactFields(t *testing.T) {
	store, err := checkout.NewStore(t.TempDir())
	if err != nil {
		t.Fatalf("NewStore() error = %v", err)
	}
	server := NewServer(
		config.Config{CheckoutEnabled: true, BrandName: "TestVPN"},
		checkout.NewService(store, remnawave.New(remnawave.Config{}), checkout.ServiceConfig{}),
		slog.New(slog.NewTextHandler(bytes.NewBuffer(nil), nil)),
	)

	body := bytes.NewBufferString(`{"planId":"quarter","telegram":"` + strings.Repeat("a", 65) + `","consent":true}`)
	req := httptest.NewRequest(http.MethodPost, "/api/checkout", body)
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	server.Routes().ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d; body = %s", rec.Code, http.StatusBadRequest, rec.Body.String())
	}
}

func TestSecurityHeadersAreSet(t *testing.T) {
	store, err := checkout.NewStore(t.TempDir())
	if err != nil {
		t.Fatalf("NewStore() error = %v", err)
	}
	server := NewServer(
		config.Config{CheckoutEnabled: true, BrandName: "TestVPN"},
		checkout.NewService(store, remnawave.New(remnawave.Config{}), checkout.ServiceConfig{}),
		slog.New(slog.NewTextHandler(bytes.NewBuffer(nil), nil)),
	)

	req := httptest.NewRequest(http.MethodGet, "/api/config", nil)
	rec := httptest.NewRecorder()

	server.Routes().ServeHTTP(rec, req)

	if got := rec.Header().Get("Content-Security-Policy"); got == "" {
		t.Fatal("Content-Security-Policy header is empty")
	}
	if got := rec.Header().Get("X-Frame-Options"); got != "DENY" {
		t.Fatalf("X-Frame-Options = %q, want DENY", got)
	}
}

func writeTestJSON(w http.ResponseWriter, payload any) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		panic(err)
	}
}
