package api

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"net/mail"
	"strings"
	"time"

	"vpn_web/internal/checkout"
	"vpn_web/internal/config"
)

type Server struct {
	cfg      config.Config
	checkout *checkout.Service
	logger   *slog.Logger
}

func NewServer(cfg config.Config, checkoutService *checkout.Service, logger *slog.Logger) *Server {
	return &Server{cfg: cfg, checkout: checkoutService, logger: logger}
}

func (s *Server) Routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/health", s.handleHealth)
	mux.HandleFunc("GET /api/config", s.handleConfig)
	mux.HandleFunc("GET /api/plans", s.handlePlans)
	mux.HandleFunc("POST /api/checkout", s.handleCheckout)
	mux.HandleFunc("GET /api/checkout/{id}", s.handleGetCheckout)
	return withSecurityHeaders(mux)
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"ok":               true,
		"remnawaveEnabled": s.checkout.RemnawaveEnabled(),
		"time":             time.Now().UTC().Format(time.RFC3339),
	})
}

func (s *Server) handleConfig(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"brandName":           s.cfg.BrandName,
		"supportTelegramUrl":  s.cfg.SupportTelegramURL,
		"supportEmail":        s.cfg.SupportEmail,
		"paymentProvider":     "online",
		"checkoutEnabled":     s.cfg.PaymentStubEnabled,
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

func (s *Server) handleCheckout(w http.ResponseWriter, r *http.Request) {
	if !s.cfg.PaymentStubEnabled {
		writeError(w, http.StatusServiceUnavailable, "payment_disabled", "Онлайн-оформление временно недоступно. Напишите в поддержку.")
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
	if _, ok := checkout.FindPlan(req.PlanID); !ok {
		writeError(w, http.StatusBadRequest, "unknown_plan", "Такой тариф не найден.")
		return
	}
	if req.Email != "" {
		if _, err := mail.ParseAddress(req.Email); err != nil {
			writeError(w, http.StatusBadRequest, "bad_email", "Email выглядит некорректно.")
			return
		}
	}
	if req.Email == "" && req.Telegram == "" {
		writeError(w, http.StatusBadRequest, "contact_required", "Оставь Telegram или email для профиля и восстановления доступа.")
		return
	}

	result, err := s.checkout.Start(r.Context(), checkout.CreateInput{
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
		"checkout": result,
		"payment": map[string]any{
			"provider": "online",
			"status":   "paid",
			"message":  result.PaymentMessage,
		},
	})
}

func (s *Server) handleGetCheckout(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimSpace(r.PathValue("id"))
	checkout, ok := s.checkout.Get(id)
	if !ok {
		writeError(w, http.StatusNotFound, "checkout_not_found", "Оформление не найдено.")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"checkout": checkout})
}

func (s *Server) writeCheckoutError(w http.ResponseWriter, result checkout.Checkout, err error) {
	switch {
	case errors.Is(err, checkout.ErrRemnawaveNotConfigured):
		writeJSON(w, http.StatusFailedDependency, map[string]any{
			"checkout": result,
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
			"checkout": result,
			"error": map[string]string{
				"code":    "provision_failed",
				"message": "Оплата подтверждена, но доступ не удалось выдать автоматически. Напишите в поддержку.",
			},
		})
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
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		w.Header().Set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
		next.ServeHTTP(w, r)
	})
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}
