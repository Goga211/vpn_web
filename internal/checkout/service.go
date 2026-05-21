package checkout

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"strings"
	"time"

	"vpn_web/internal/remnawave"
)

var (
	ErrRemnawaveNotConfigured = errors.New("remnawave not configured")
	ErrSubscriptionURLMissing = errors.New("remnawave returned empty subscription URL")
)

type ServiceConfig struct {
	RemnawaveTag         string
	ActiveInternalSquads []string
}

type RemnawaveClient interface {
	Enabled() bool
	CreateUser(ctx context.Context, req remnawave.CreateUserRequest) (remnawave.User, error)
	GetSubscriptionByUsername(ctx context.Context, username string) (remnawave.Subscription, error)
}

type Service struct {
	store *Store
	remna RemnawaveClient
	cfg   ServiceConfig
}

func NewService(store *Store, remna RemnawaveClient, cfg ServiceConfig) *Service {
	return &Service{store: store, remna: remna, cfg: cfg}
}

func (s *Service) RemnawaveEnabled() bool {
	return s.remna != nil && s.remna.Enabled()
}

func (s *Service) Plans() []Plan {
	return Plans
}

func (s *Service) Start(ctx context.Context, input CreateInput) (Checkout, error) {
	checkout, err := s.store.Create(input)
	if err != nil {
		return Checkout{}, err
	}
	return s.Provision(ctx, checkout)
}

func (s *Service) Provision(ctx context.Context, checkout Checkout) (Checkout, error) {
	if !s.RemnawaveEnabled() {
		updated, err := s.markFailed(checkout.ID, "Автоматическая выдача временно недоступна. Напишите в поддержку, и мы поможем оформить доступ.")
		if err != nil {
			return updated, errors.Join(ErrRemnawaveNotConfigured, err)
		}
		return updated, ErrRemnawaveNotConfigured
	}
	if checkout.SubscriptionURL != "" {
		return checkout, nil
	}

	plan, ok := FindPlan(checkout.PlanID)
	if !ok {
		return checkout, ErrUnknownPlan
	}

	username := remnawave.SuggestedUsername(firstNonEmpty(checkout.Telegram, checkout.Email, checkout.Contact, checkout.ID))
	email := strings.TrimSpace(checkout.Email)
	var emailPtr *string
	if email != "" {
		emailPtr = &email
	}

	expires := time.Now().UTC().Add(plan.Duration()).Format(time.RFC3339Nano)
	user, err := s.remna.CreateUser(ctx, remnawave.CreateUserRequest{
		Username:             username,
		Status:               "ACTIVE",
		TrafficLimitBytes:    plan.TrafficLimitBytes(),
		TrafficLimitStrategy: "NO_RESET",
		ExpireAt:             expires,
		Description:          fmt.Sprintf("Website checkout %s, plan %s", checkout.ID, checkout.PlanID),
		Tag:                  s.cfg.RemnawaveTag,
		Email:                emailPtr,
		HWIDDeviceLimit:      plan.Devices,
		ActiveInternalSquads: s.cfg.ActiveInternalSquads,
	})
	if err != nil {
		updated, updateErr := s.markFailed(checkout.ID, sanitizeError(err))
		return updated, errors.Join(err, updateErr)
	}

	subscriptionURL := user.SubscriptionURL
	if subscriptionURL == "" {
		subscription, subErr := s.remna.GetSubscriptionByUsername(ctx, username)
		if subErr == nil {
			subscriptionURL = subscription.SubscriptionURL
		}
	}
	if !isHTTPURL(subscriptionURL) {
		updated, _, updateErr := s.store.Update(checkout.ID, func(checkout Checkout) Checkout {
			checkout.Status = StatusFailed
			checkout.Username = username
			checkout.ProvisionError = "Не удалось получить ссылку подписки. Напишите в поддержку, и мы поможем подключиться."
			return checkout
		})
		return updated, errors.Join(ErrSubscriptionURLMissing, updateErr)
	}

	updated, _, err := s.store.Update(checkout.ID, func(checkout Checkout) Checkout {
		checkout.Status = StatusProvisioned
		checkout.Username = username
		checkout.SubscriptionURL = subscriptionURL
		checkout.ProvisionError = ""
		return checkout
	})
	return updated, err
}

func isHTTPURL(rawURL string) bool {
	parsed, err := url.Parse(strings.TrimSpace(rawURL))
	if err != nil {
		return false
	}
	return (parsed.Scheme == "https" || parsed.Scheme == "http") && parsed.Host != ""
}

func (s *Service) markFailed(id, message string) (Checkout, error) {
	updated, _, err := s.store.Update(id, func(checkout Checkout) Checkout {
		checkout.Status = StatusFailed
		checkout.ProvisionError = message
		return checkout
	})
	return updated, err
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}

func sanitizeError(err error) string {
	if err == nil {
		return ""
	}
	text := err.Error()
	if len(text) > 240 {
		return text[:240]
	}
	return text
}
