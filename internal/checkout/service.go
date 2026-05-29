package checkout

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"strings"
	"time"

	"access_web/internal/remnawave"
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
	GetInternalSquads(ctx context.Context) ([]remnawave.InternalSquad, error)
	GetSubscriptionByUsername(ctx context.Context, username string) (remnawave.Subscription, error)
	GetUsersByTelegramID(ctx context.Context, telegramID int64) ([]remnawave.User, error)
	UpdateUser(ctx context.Context, req remnawave.UpdateUserRequest) (remnawave.User, error)
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

	// Если оформление пришло из Telegram Mini App (есть проверенный Telegram ID),
	// продлеваем существующего пользователя вместо создания дубля.
	if checkout.TelegramID != 0 {
		if existing, ok := s.findRenewableUser(ctx, checkout.TelegramID); ok {
			return s.renew(ctx, checkout, plan, existing)
		}
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
		TelegramID:           checkout.TelegramID,
		HWIDDeviceLimit:      plan.Devices,
		ActiveInternalSquads: s.selectSquads(ctx),
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

// selectSquads выбирает сквад для нового пользователя, балансируя нагрузку:
// возвращает UUID наименее заполненного сквада (по info.membersCount).
// Если в конфиге задан whitelist (cfg.ActiveInternalSquads), балансировка идёт
// только среди этих сквадов; иначе — среди всех сквадов панели.
// При ошибке запроса или отсутствии подходящих сквадов откатываемся к списку
// из конфига, чтобы поведение оставалось предсказуемым.
func (s *Service) selectSquads(ctx context.Context) []string {
	squads, err := s.remna.GetInternalSquads(ctx)
	if err != nil || len(squads) == 0 {
		return s.cfg.ActiveInternalSquads
	}

	allowed := s.cfg.ActiveInternalSquads
	best := -1
	for i := range squads {
		if len(allowed) > 0 && !containsString(allowed, squads[i].UUID) {
			continue
		}
		if best < 0 || squads[i].Info.MembersCount < squads[best].Info.MembersCount {
			best = i
		}
	}
	if best < 0 {
		return s.cfg.ActiveInternalSquads
	}
	return []string{squads[best].UUID}
}

func containsString(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}

// findRenewableUser ищет существующего пользователя панели по Telegram ID.
// Ошибки поиска не блокируют оформление — в этом случае создаём нового пользователя.
func (s *Service) findRenewableUser(ctx context.Context, telegramID int64) (remnawave.User, bool) {
	users, err := s.remna.GetUsersByTelegramID(ctx, telegramID)
	if err != nil || len(users) == 0 {
		return remnawave.User{}, false
	}
	// Предпочитаем активного пользователя; иначе берём первого с валидным UUID.
	var fallback remnawave.User
	for _, user := range users {
		if user.UUID == "" {
			continue
		}
		if strings.EqualFold(user.Status, "ACTIVE") {
			return user, true
		}
		if fallback.UUID == "" {
			fallback = user
		}
	}
	return fallback, fallback.UUID != ""
}

// renew продлевает доступ существующего пользователя через PATCH вместо создания дубля.
func (s *Service) renew(ctx context.Context, checkout Checkout, plan Plan, existing remnawave.User) (Checkout, error) {
	expires := extendExpiry(existing.ExpireAt, plan.Duration())
	user, err := s.remna.UpdateUser(ctx, remnawave.UpdateUserRequest{
		UUID:     existing.UUID,
		Status:   "ACTIVE",
		ExpireAt: expires,
	})
	if err != nil {
		updated, updateErr := s.markFailed(checkout.ID, sanitizeError(err))
		return updated, errors.Join(err, updateErr)
	}

	username := firstNonEmpty(user.Username, existing.Username)
	subscriptionURL := firstNonEmpty(user.SubscriptionURL, existing.SubscriptionURL)
	if subscriptionURL == "" && username != "" {
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

// extendExpiry возвращает новый срок: max(текущий expireAt, сейчас) + длительность плана.
func extendExpiry(currentExpire string, dur time.Duration) string {
	base := time.Now().UTC()
	if currentExpire != "" {
		if parsed, err := time.Parse(time.RFC3339, currentExpire); err == nil && parsed.After(base) {
			base = parsed.UTC()
		}
	}
	return base.Add(dur).Format(time.RFC3339Nano)
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
