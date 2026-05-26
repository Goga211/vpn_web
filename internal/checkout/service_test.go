package checkout

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"access_web/internal/remnawave"
)

func TestServiceMarksCheckoutFailedWhenRemnawaveIsDisabled(t *testing.T) {
	store, err := NewStore(t.TempDir())
	if err != nil {
		t.Fatalf("NewStore() error = %v", err)
	}
	created, err := store.Create(CreateInput{PlanID: "month", Telegram: "@client"})
	if err != nil {
		t.Fatalf("Create() error = %v", err)
	}

	service := NewService(store, &fakeRemnawaveClient{}, ServiceConfig{})
	got, err := service.Provision(context.Background(), created)
	if !errors.Is(err, ErrRemnawaveNotConfigured) {
		t.Fatalf("Provision() error = %v, want ErrRemnawaveNotConfigured", err)
	}
	if got.Status != StatusFailed {
		t.Fatalf("status = %q, want %q", got.Status, StatusFailed)
	}
	if !strings.Contains(got.ProvisionError, "Автоматическая выдача") {
		t.Fatalf("provision error = %q, want setup hint", got.ProvisionError)
	}
}

func TestServiceProvisionsCheckoutAndFallsBackToSubscriptionLookup(t *testing.T) {
	store, err := NewStore(t.TempDir())
	if err != nil {
		t.Fatalf("NewStore() error = %v", err)
	}
	client := &fakeRemnawaveClient{enabled: true}
	service := NewService(store, client, ServiceConfig{
		RemnawaveTag:         "WEB",
		ActiveInternalSquads: []string{"11111111-1111-1111-1111-111111111111"},
	})

	got, err := service.Start(context.Background(), CreateInput{
		PlanID:   "month",
		Contact:  "@client",
		Email:    "client@example.com",
		Telegram: "@client",
	})
	if err != nil {
		t.Fatalf("Start() error = %v", err)
	}

	if got.Status != StatusProvisioned {
		t.Fatalf("status = %q, want %q", got.Status, StatusProvisioned)
	}
	if got.SubscriptionURL == "" || !strings.HasPrefix(got.SubscriptionURL, "https://subs.example/") {
		t.Fatalf("subscription URL = %q", got.SubscriptionURL)
	}
	if client.createCalls != 1 || client.subscriptionCalls != 1 {
		t.Fatalf("create calls = %d, subscription calls = %d", client.createCalls, client.subscriptionCalls)
	}
	if client.subscriptionUsername != client.createRequest.Username {
		t.Fatalf("subscription username = %q, create username = %q", client.subscriptionUsername, client.createRequest.Username)
	}
	if client.createRequest.Status != "ACTIVE" {
		t.Fatalf("status request = %q", client.createRequest.Status)
	}
	if client.createRequest.TrafficLimitStrategy != "NO_RESET" {
		t.Fatalf("traffic strategy = %q", client.createRequest.TrafficLimitStrategy)
	}
	if client.createRequest.Tag != "WEB" {
		t.Fatalf("tag = %q", client.createRequest.Tag)
	}
	if client.createRequest.HWIDDeviceLimit != 5 {
		t.Fatalf("hwid device limit = %d", client.createRequest.HWIDDeviceLimit)
	}
	if len(client.createRequest.ActiveInternalSquads) != 1 || client.createRequest.ActiveInternalSquads[0] != "11111111-1111-1111-1111-111111111111" {
		t.Fatalf("active internal squads = %#v", client.createRequest.ActiveInternalSquads)
	}
	if client.createRequest.Email == nil || *client.createRequest.Email != "client@example.com" {
		t.Fatalf("email = %v", client.createRequest.Email)
	}
	if _, err := time.Parse(time.RFC3339Nano, client.createRequest.ExpireAt); err != nil {
		t.Fatalf("expireAt = %q, parse error = %v", client.createRequest.ExpireAt, err)
	}
}

func TestServiceRejectsUnsafeSubscriptionURL(t *testing.T) {
	store, err := NewStore(t.TempDir())
	if err != nil {
		t.Fatalf("NewStore() error = %v", err)
	}
	client := &fakeRemnawaveClient{
		enabled:         true,
		subscriptionURL: "javascript:alert(1)",
	}
	service := NewService(store, client, ServiceConfig{RemnawaveTag: "WEB"})

	got, err := service.Start(context.Background(), CreateInput{
		PlanID:   "month",
		Telegram: "@client",
	})
	if !errors.Is(err, ErrSubscriptionURLMissing) {
		t.Fatalf("Start() error = %v, want ErrSubscriptionURLMissing", err)
	}
	if got.Status != StatusFailed {
		t.Fatalf("status = %q, want %q", got.Status, StatusFailed)
	}
	if got.SubscriptionURL != "" {
		t.Fatalf("subscription URL = %q, want empty", got.SubscriptionURL)
	}
}

type fakeRemnawaveClient struct {
	enabled              bool
	createCalls          int
	subscriptionCalls    int
	createRequest        remnawave.CreateUserRequest
	subscriptionUsername string
	subscriptionURL      string
}

func (f *fakeRemnawaveClient) Enabled() bool {
	return f.enabled
}

func (f *fakeRemnawaveClient) CreateUser(_ context.Context, req remnawave.CreateUserRequest) (remnawave.User, error) {
	f.createCalls++
	f.createRequest = req
	return remnawave.User{Username: req.Username}, nil
}

func (f *fakeRemnawaveClient) GetSubscriptionByUsername(_ context.Context, username string) (remnawave.Subscription, error) {
	f.subscriptionCalls++
	f.subscriptionUsername = username
	if f.subscriptionURL != "" {
		return remnawave.Subscription{SubscriptionURL: f.subscriptionURL}, nil
	}
	return remnawave.Subscription{SubscriptionURL: "https://subs.example/" + username}, nil
}
