package api

import (
	"bytes"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"access_web/internal/checkout"
	"access_web/internal/config"
	"access_web/internal/remnawave"
)

func TestCheckoutRequiresConfiguredRemnawave(t *testing.T) {
	store, err := checkout.NewStore(t.TempDir())
	if err != nil {
		t.Fatalf("NewStore() error = %v", err)
	}
	remna := remnawave.New(remnawave.Config{})
	server := NewServer(
		config.Config{CheckoutEnabled: true, BrandName: "TestBrand"},
		checkout.NewService(store, remna, checkout.ServiceConfig{}),
		slog.New(slog.NewTextHandler(bytes.NewBuffer(nil), nil)),
	)

	body := bytes.NewBufferString(`{"planId":"trial","telegram":"@client","consent":true}`)
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
		config.Config{CheckoutEnabled: true, BrandName: "TestBrand", RemnawaveTag: "WEB"},
		checkout.NewService(store, remnawaveClient, checkout.ServiceConfig{RemnawaveTag: "WEB"}),
		slog.New(slog.NewTextHandler(bytes.NewBuffer(nil), nil)),
	)

	body := bytes.NewBufferString(`{"planId":"trial","telegram":"@client","consent":true}`)
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
		config.Config{CheckoutEnabled: true, BrandName: "TestBrand"},
		checkout.NewService(store, remnawave.New(remnawave.Config{}), checkout.ServiceConfig{}),
		slog.New(slog.NewTextHandler(bytes.NewBuffer(nil), nil)),
	)

	body := bytes.NewBufferString(`{"planId":"trial","telegram":"` + strings.Repeat("a", 65) + `","consent":true}`)
	req := httptest.NewRequest(http.MethodPost, "/api/checkout", body)
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	server.Routes().ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d; body = %s", rec.Code, http.StatusBadRequest, rec.Body.String())
	}
}

func TestCheckoutRejectsPaidPlansWhilePaymentsAreDisabled(t *testing.T) {
	store, err := checkout.NewStore(t.TempDir())
	if err != nil {
		t.Fatalf("NewStore() error = %v", err)
	}
	server := NewServer(
		config.Config{CheckoutEnabled: true, BrandName: "TestBrand"},
		checkout.NewService(store, remnawave.New(remnawave.Config{}), checkout.ServiceConfig{}),
		slog.New(slog.NewTextHandler(bytes.NewBuffer(nil), nil)),
	)

	body := bytes.NewBufferString(`{"planId":"month","telegram":"@client","consent":true}`)
	req := httptest.NewRequest(http.MethodPost, "/api/checkout", body)
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	server.Routes().ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d; body = %s", rec.Code, http.StatusBadRequest, rec.Body.String())
	}
	var payload struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if payload.Error.Code != "paid_plans_disabled" {
		t.Fatalf("error code = %q", payload.Error.Code)
	}
}

func newTestServer(t *testing.T) *Server {
	t.Helper()
	store, err := checkout.NewStore(t.TempDir())
	if err != nil {
		t.Fatalf("NewStore() error = %v", err)
	}
	return NewServer(
		config.Config{CheckoutEnabled: true, BrandName: "TestBrand"},
		checkout.NewService(store, remnawave.New(remnawave.Config{}), checkout.ServiceConfig{}),
		slog.New(slog.NewTextHandler(bytes.NewBuffer(nil), nil)),
	)
}

func TestDevCORSAllowsLocalOriginPreflight(t *testing.T) {
	server := newTestServer(t)

	req := httptest.NewRequest(http.MethodOptions, "/api/checkout", nil)
	req.Host = "localhost:8080"
	req.Header.Set("Origin", "http://localhost:5173")
	rec := httptest.NewRecorder()

	server.Routes().ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("preflight status = %d, want %d", rec.Code, http.StatusNoContent)
	}
	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "http://localhost:5173" {
		t.Fatalf("Access-Control-Allow-Origin = %q", got)
	}
}

func TestDevCORSRejectsNonLocalOrigin(t *testing.T) {
	server := newTestServer(t)

	req := httptest.NewRequest(http.MethodOptions, "/api/checkout", nil)
	req.Host = "example.com"
	req.Header.Set("Origin", "https://evil.example")
	rec := httptest.NewRecorder()

	server.Routes().ServeHTTP(rec, req)

	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "" {
		t.Fatalf("Access-Control-Allow-Origin = %q, want empty for non-local origin", got)
	}
}

func writeTestJSON(w http.ResponseWriter, payload any) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		panic(err)
	}
}
