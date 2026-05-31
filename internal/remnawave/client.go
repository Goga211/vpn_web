package remnawave

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"
)

type Client struct {
	baseURL  string
	username string
	password string
	token    string
	client   *http.Client
	mu       sync.Mutex
}

type Config struct {
	BaseURL  string
	Username string
	Password string
	Token    string
	Timeout  time.Duration
}

type CreateUserRequest struct {
	Username             string   `json:"username"`
	Status               string   `json:"status,omitempty"`
	TrafficLimitBytes    int64    `json:"trafficLimitBytes"`
	TrafficLimitStrategy string   `json:"trafficLimitStrategy,omitempty"`
	ExpireAt             string   `json:"expireAt"`
	Description          string   `json:"description,omitempty"`
	Tag                  string   `json:"tag,omitempty"`
	Email                *string  `json:"email,omitempty"`
	TelegramID           int64    `json:"telegramId,omitempty"`
	HWIDDeviceLimit      int      `json:"hwidDeviceLimit,omitempty"`
	ActiveInternalSquads []string `json:"activeInternalSquads,omitempty"`
}

// UpdateUserRequest используется для продления доступа существующего
// пользователя через PATCH /api/users (минимальный набор полей).
type UpdateUserRequest struct {
	UUID     string `json:"uuid"`
	Status   string `json:"status,omitempty"`
	ExpireAt string `json:"expireAt,omitempty"`
}

type User struct {
	UUID            string `json:"uuid"`
	ShortUUID       string `json:"shortUuid"`
	Username        string `json:"username"`
	Status          string `json:"status"`
	ExpireAt        string `json:"expireAt"`
	TelegramID      int64  `json:"telegramId"`
	SubscriptionURL string `json:"subscriptionUrl"`
}

// InternalSquad описывает сквад панели. Поле Info.MembersCount используется
// для балансировки новых пользователей по наименее загруженным сквадам.
type InternalSquad struct {
	UUID string `json:"uuid"`
	Name string `json:"name"`
	Info struct {
		MembersCount  int `json:"membersCount"`
		InboundsCount int `json:"inboundsCount"`
	} `json:"info"`
}

type Subscription struct {
	IsFound         bool     `json:"isFound"`
	SubscriptionURL string   `json:"subscriptionUrl"`
	Links           []string `json:"links"`
	User            struct {
		ShortUUID string  `json:"shortUuid"`
		Username  string  `json:"username"`
		DaysLeft  float64 `json:"daysLeft"`
		IsActive  bool    `json:"isActive"`
		Status    string  `json:"userStatus"`
		ExpiresAt string  `json:"expiresAt"`
	} `json:"user"`
}

func New(cfg Config) *Client {
	timeout := cfg.Timeout
	if timeout <= 0 {
		timeout = 12 * time.Second
	}
	return &Client{
		baseURL:  strings.TrimRight(cfg.BaseURL, "/"),
		username: cfg.Username,
		password: cfg.Password,
		token:    cfg.Token,
		client:   &http.Client{Timeout: timeout},
	}
}

func (c *Client) Enabled() bool {
	if c == nil || c.baseURL == "" {
		return false
	}
	return c.token != "" || (c.username != "" && c.password != "")
}

func (c *Client) CreateUser(ctx context.Context, req CreateUserRequest) (User, error) {
	var envelope struct {
		Response User `json:"response"`
	}
	if err := c.do(ctx, http.MethodPost, "/api/users", req, &envelope); err != nil {
		return User{}, err
	}
	return envelope.Response, nil
}

func (c *Client) GetSubscriptionByUsername(ctx context.Context, username string) (Subscription, error) {
	var envelope struct {
		Response Subscription `json:"response"`
	}
	path := "/api/subscriptions/by-username/" + url.PathEscape(username)
	if err := c.do(ctx, http.MethodGet, path, nil, &envelope); err != nil {
		return Subscription{}, err
	}
	return envelope.Response, nil
}

// GetInternalSquads возвращает список сквадов панели со счётчиком участников.
func (c *Client) GetInternalSquads(ctx context.Context) ([]InternalSquad, error) {
	var envelope struct {
		Response struct {
			Total          int             `json:"total"`
			InternalSquads []InternalSquad `json:"internalSquads"`
		} `json:"response"`
	}
	if err := c.do(ctx, http.MethodGet, "/api/internal-squads", nil, &envelope); err != nil {
		return nil, err
	}
	return envelope.Response.InternalSquads, nil
}

// GetUsersByTelegramID возвращает пользователей панели, привязанных к данному
// Telegram ID. Используется, чтобы продлевать доступ вместо создания дублей.
func (c *Client) GetUsersByTelegramID(ctx context.Context, telegramID int64) ([]User, error) {
	var envelope struct {
		Response []User `json:"response"`
	}
	path := "/api/users/by-telegram-id/" + url.PathEscape(strconv.FormatInt(telegramID, 10))
	if err := c.do(ctx, http.MethodGet, path, nil, &envelope); err != nil {
		return nil, err
	}
	return envelope.Response, nil
}

// UpdateUser продлевает/обновляет существующего пользователя через PATCH /api/users.
func (c *Client) UpdateUser(ctx context.Context, req UpdateUserRequest) (User, error) {
	var envelope struct {
		Response User `json:"response"`
	}
	if err := c.do(ctx, http.MethodPatch, "/api/users", req, &envelope); err != nil {
		return User{}, err
	}
	return envelope.Response, nil
}

func (c *Client) do(ctx context.Context, method, path string, body any, out any) error {
	token, err := c.getToken(ctx)
	if err != nil {
		return err
	}
	err = c.doWithToken(ctx, method, path, body, out, token)
	if err == nil {
		return nil
	}
	var apiErr apiError
	if errors.As(err, &apiErr) && apiErr.StatusCode == http.StatusUnauthorized && c.username != "" && c.password != "" {
		c.mu.Lock()
		c.token = ""
		c.mu.Unlock()
		token, tokenErr := c.getToken(ctx)
		if tokenErr != nil {
			return tokenErr
		}
		return c.doWithToken(ctx, method, path, body, out, token)
	}
	return err
}

func (c *Client) doWithToken(ctx context.Context, method, path string, body any, out any, token string) error {
	var reader io.Reader
	if body != nil {
		payload, err := json.Marshal(body)
		if err != nil {
			return err
		}
		reader = bytes.NewReader(payload)
	}

	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, reader)
	if err != nil {
		return err
	}
	req.Header.Set("Accept", "application/json")
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := c.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	return decodeResponse(resp, out)
}

func (c *Client) getToken(ctx context.Context) (string, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.token != "" {
		return c.token, nil
	}
	if c.username == "" || c.password == "" {
		return "", errors.New("remnawave credentials are not configured")
	}

	payload, err := json.Marshal(map[string]string{
		"username": c.username,
		"password": c.password,
	})
	if err != nil {
		return "", err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/api/auth/login", bytes.NewReader(payload))
	if err != nil {
		return "", err
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var envelope struct {
		Response struct {
			AccessToken string `json:"accessToken"`
		} `json:"response"`
	}
	if err := decodeResponse(resp, &envelope); err != nil {
		return "", err
	}
	if envelope.Response.AccessToken == "" {
		return "", errors.New("remnawave login response does not contain access token")
	}
	c.token = envelope.Response.AccessToken
	return c.token, nil
}

type apiError struct {
	StatusCode int
	Body       string
}

func (e apiError) Error() string {
	return fmt.Sprintf("remnawave API returned %d: %s", e.StatusCode, e.Body)
}

func decodeResponse(resp *http.Response, out any) error {
	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return apiError{StatusCode: resp.StatusCode, Body: strings.TrimSpace(string(body))}
	}
	if out == nil || len(body) == 0 {
		return nil
	}
	if err := json.Unmarshal(body, out); err != nil {
		return err
	}
	return nil
}

func SuggestedUsername(seed string) string {
	clean := strings.ToLower(seed)
	var b strings.Builder
	for _, r := range clean {
		switch {
		case r >= 'a' && r <= 'z':
			b.WriteRune(r)
		case r >= '0' && r <= '9':
			b.WriteRune(r)
		case r == '_' || r == '-':
			b.WriteRune(r)
		}
	}
	name := strings.Trim(b.String(), "_-")
	if len(name) > 20 {
		name = name[:20]
	}
	if len(name) < 3 {
		name = "web"
	}
	return name + "_" + randomHex(4)
}

func randomHex(size int) string {
	buf := make([]byte, size)
	if _, err := rand.Read(buf); err != nil {
		return fmt.Sprintf("%d", time.Now().Unix()%100000)
	}
	return hex.EncodeToString(buf)
}
