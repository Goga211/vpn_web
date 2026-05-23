package api

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net"
	"net/http"
	"net/mail"
	"net/url"
	"strings"
	"time"

	"access_web/internal/checkout"
	"access_web/internal/config"
)

type Server struct {
	cfg             config.Config
	checkout        *checkout.Service
	checkoutLimiter *rateLimiter
	logger          *slog.Logger
}

func NewServer(cfg config.Config, checkoutService *checkout.Service, logger *slog.Logger) *Server {
	return &Server{
		cfg:             cfg,
		checkout:        checkoutService,
		checkoutLimiter: newRateLimiter(20, 10*time.Minute),
		logger:          logger,
	}
}

func (s *Server) Routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/health", s.handleHealth)
	mux.HandleFunc("GET /api/config", s.handleConfig)
	mux.HandleFunc("GET /api/plans", s.handlePlans)
	mux.HandleFunc("POST /api/checkout", s.handleCheckout)
	return withSecurityHeaders(mux)
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"ok":   true,
		"time": time.Now().UTC().Format(time.RFC3339),
	})
}

func (s *Server) handleConfig(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"brandName":           s.cfg.BrandName,
		"supportTelegramUrl":  s.cfg.SupportTelegramURL,
		"supportEmail":        s.cfg.SupportEmail,
		"paymentProvider":     "online",
		"checkoutEnabled":     s.cfg.CheckoutEnabled,
		"provisioningEnabled": s.checkout.RemnawaveEnabled(),
	})
}

func (s *Server) handlePlans(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"plans": s.checkout.Plans()})
}

type checkoutRequest struct {
	PlanID   string `json:"planId"`
	Contact  string `json:"contact"`
	Email    string `json:"email"`
	Telegram string `json:"telegram"`
	Consent  bool   `json:"consent"`
}

const (
	maxTelegramLength = 64
	maxEmailLength    = 254
	maxContactLength  = 500
)

func (s *Server) handleCheckout(w http.ResponseWriter, r *http.Request) {
	if !s.cfg.CheckoutEnabled {
		writeError(w, http.StatusServiceUnavailable, "payment_disabled", "Онлайн-оформление временно недоступно. Напишите в поддержку.")
		return
	}
	if !s.checkoutLimiter.Allow(clientIP(r)) {
		writeError(w, http.StatusTooManyRequests, "rate_limited", "Слишком много попыток оформления. Попробуйте позже.")
		return
	}

	var req checkoutRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64<<10)).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "bad_json", "Не получилось разобрать оформление.")
		return
	}
	if !req.Consent {
		writeError(w, http.StatusBadRequest, "consent_required", "Нужно согласие на обработку оформления.")
		return
	}
	req.PlanID = strings.TrimSpace(req.PlanID)
	req.Contact = strings.TrimSpace(req.Contact)
	req.Email = strings.TrimSpace(req.Email)
	req.Telegram = strings.TrimSpace(req.Telegram)
	if len(req.Telegram) > maxTelegramLength {
		writeError(w, http.StatusBadRequest, "bad_telegram", "Telegram слишком длинный.")
		return
	}
	if len(req.Email) > maxEmailLength {
		writeError(w, http.StatusBadRequest, "bad_email", "Email слишком длинный.")
		return
	}
	if len(req.Contact) > maxContactLength {
		writeError(w, http.StatusBadRequest, "bad_contact", "Комментарий слишком длинный.")
		return
	}
	if _, ok := checkout.FindPlan(req.PlanID); !ok {
		writeError(w, http.StatusBadRequest, "unknown_plan", "Такой тариф не найден.")
		return
	}
	if req.Email != "" {
		addr, err := mail.ParseAddress(req.Email)
		if err != nil || addr.Address == "" {
			writeError(w, http.StatusBadRequest, "bad_email", "Email выглядит некорректно.")
			return
		}
		req.Email = addr.Address
	}
	if req.Email == "" && req.Telegram == "" {
		writeError(w, http.StatusBadRequest, "contact_required", "Оставь Telegram или email для профиля и восстановления доступа.")
		return
	}

	provisionCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	result, err := s.checkout.Start(provisionCtx, checkout.CreateInput{
		PlanID:   req.PlanID,
		Contact:  firstNonEmpty(req.Telegram, req.Email, req.Contact),
		Email:    req.Email,
		Telegram: req.Telegram,
	})
	if err != nil {
		s.writeCheckoutError(w, result, err)
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"checkout": newCheckoutResponse(result),
		"payment": map[string]any{
			"provider": "online",
			"status":   "paid",
			"message":  result.PaymentMessage,
		},
	})
}

func (s *Server) writeCheckoutError(w http.ResponseWriter, result checkout.Checkout, err error) {
	switch {
	case errors.Is(err, checkout.ErrRemnawaveNotConfigured):
		writeJSON(w, http.StatusFailedDependency, map[string]any{
			"checkout": newCheckoutResponse(result),
			"error": map[string]string{
				"code":    "remnawave_not_configured",
				"message": "Автоматическая выдача временно недоступна. Напишите в поддержку, и мы поможем оформить доступ.",
			},
		})
	case errors.Is(err, checkout.ErrUnknownPlan):
		writeError(w, http.StatusBadRequest, "unknown_plan", "Такой тариф не найден.")
	default:
		s.logger.Error("checkout failed", "checkout", result.ID, "err", err)
		writeJSON(w, http.StatusBadGateway, map[string]any{
			"checkout": newCheckoutResponse(result),
			"error": map[string]string{
				"code":    "provision_failed",
				"message": "Оплата подтверждена, но доступ не удалось выдать автоматически. Напишите в поддержку.",
			},
		})
	}
}

type checkoutResponse struct {
	ID              string `json:"id"`
	PlanName        string `json:"planName"`
	PriceRUB        int    `json:"priceRub"`
	Status          string `json:"status"`
	SubscriptionURL string `json:"subscriptionUrl,omitempty"`
}

func newCheckoutResponse(checkout checkout.Checkout) checkoutResponse {
	return checkoutResponse{
		ID:              checkout.ID,
		PlanName:        checkout.PlanName,
		PriceRUB:        checkout.PriceRUB,
		Status:          checkout.Status,
		SubscriptionURL: checkout.SubscriptionURL,
	}
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, map[string]any{
		"error": map[string]string{
			"code":    code,
			"message": message,
		},
	})
}

func withSecurityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'")
		w.Header().Set("Cross-Origin-Opener-Policy", "same-origin")
		w.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		w.Header().Set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
		if allowLocalDevCORS(w, r) && r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func allowLocalDevCORS(w http.ResponseWriter, r *http.Request) bool {
	origin := r.Header.Get("Origin")
	if origin == "" || !isLocalHost(r.Host) {
		return false
	}

	originURL, err := url.Parse(origin)
	if err != nil || !isLocalHost(originURL.Host) || !isAllowedDevPort(originURL.Port()) {
		return false
	}

	w.Header().Set("Access-Control-Allow-Origin", origin)
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Accept")
	w.Header().Add("Vary", "Origin")
	return true
}

func isLocalHost(hostPort string) bool {
	host, _, err := net.SplitHostPort(hostPort)
	if err != nil {
		host = hostPort
	}
	host = strings.Trim(host, "[]")
	return host == "localhost" || host == "127.0.0.1" || host == "::1"
}

func isAllowedDevPort(port string) bool {
	switch port {
	case "5173", "4173", "5500", "5501", "5502", "5503", "5504", "5505":
		return true
	default:
		return false
	}
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}
