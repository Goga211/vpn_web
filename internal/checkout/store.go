package checkout

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"
)

const (
	StatusPaidStub    = "paid"
	StatusProvisioned = "provisioned"
	StatusFailed      = "failed"
)

var ErrUnknownPlan = errors.New("unknown plan")

type Checkout struct {
	ID              string    `json:"id"`
	PlanID          string    `json:"planId"`
	PlanName        string    `json:"planName"`
	PriceRUB        int       `json:"priceRub"`
	Contact         string    `json:"contact"`
	Email           string    `json:"email,omitempty"`
	Telegram        string    `json:"telegram,omitempty"`
	Status          string    `json:"status"`
	PaymentProvider string    `json:"paymentProvider"`
	PaymentMessage  string    `json:"paymentMessage"`
	Username        string    `json:"username,omitempty"`
	SubscriptionURL string    `json:"subscriptionUrl,omitempty"`
	ProvisionError  string    `json:"provisionError,omitempty"`
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

type CreateInput struct {
	PlanID   string
	Contact  string
	Email    string
	Telegram string
}

type Store struct {
	mu        sync.RWMutex
	path      string
	checkouts map[string]Checkout
}

func NewStore(dataDir string) (*Store, error) {
	if err := os.MkdirAll(dataDir, 0o755); err != nil {
		return nil, err
	}
	store := &Store{
		path:      filepath.Join(dataDir, "checkouts.json"),
		checkouts: make(map[string]Checkout),
	}
	if err := store.load(); err != nil {
		return nil, err
	}
	return store, nil
}

func (s *Store) Create(input CreateInput) (Checkout, error) {
	plan, ok := FindPlan(input.PlanID)
	if !ok {
		return Checkout{}, ErrUnknownPlan
	}
	now := time.Now().UTC()
	checkout := Checkout{
		ID:              newID(),
		PlanID:          plan.ID,
		PlanName:        plan.Name,
		PriceRUB:        plan.PriceRUB,
		Contact:         strings.TrimSpace(input.Contact),
		Email:           strings.TrimSpace(input.Email),
		Telegram:        strings.TrimSpace(input.Telegram),
		Status:          StatusPaidStub,
		PaymentProvider: "online",
		PaymentMessage:  "Оплата подтверждена. Доступ активирован автоматически.",
		CreatedAt:       now,
		UpdatedAt:       now,
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	s.checkouts[checkout.ID] = checkout
	return checkout, s.saveLocked()
}

func (s *Store) Get(id string) (Checkout, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	checkout, ok := s.checkouts[id]
	return checkout, ok
}

func (s *Store) Update(id string, mutate func(Checkout) Checkout) (Checkout, bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	checkout, ok := s.checkouts[id]
	if !ok {
		return Checkout{}, false, nil
	}
	checkout = mutate(checkout)
	checkout.UpdatedAt = time.Now().UTC()
	s.checkouts[id] = checkout
	return checkout, true, s.saveLocked()
}

func (s *Store) Recent(limit int) []Checkout {
	s.mu.RLock()
	defer s.mu.RUnlock()
	checkouts := make([]Checkout, 0, len(s.checkouts))
	for _, checkout := range s.checkouts {
		checkouts = append(checkouts, checkout)
	}
	sort.Slice(checkouts, func(i, j int) bool {
		return checkouts[i].CreatedAt.After(checkouts[j].CreatedAt)
	})
	if limit > 0 && len(checkouts) > limit {
		return checkouts[:limit]
	}
	return checkouts
}

func (s *Store) load() error {
	file, err := os.Open(s.path)
	if errors.Is(err, os.ErrNotExist) {
		return nil
	}
	if err != nil {
		return err
	}
	defer file.Close()

	var checkouts []Checkout
	if err := json.NewDecoder(file).Decode(&checkouts); err != nil {
		return err
	}
	for _, checkout := range checkouts {
		s.checkouts[checkout.ID] = checkout
	}
	return nil
}

func (s *Store) saveLocked() error {
	checkouts := make([]Checkout, 0, len(s.checkouts))
	for _, checkout := range s.checkouts {
		checkouts = append(checkouts, checkout)
	}
	sort.Slice(checkouts, func(i, j int) bool {
		return checkouts[i].CreatedAt.Before(checkouts[j].CreatedAt)
	})

	tmpPath := s.path + ".tmp"
	file, err := os.OpenFile(tmpPath, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, 0o644)
	if err != nil {
		return err
	}
	encoder := json.NewEncoder(file)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(checkouts); err != nil {
		_ = file.Close()
		return err
	}
	if err := file.Close(); err != nil {
		return err
	}
	return os.Rename(tmpPath, s.path)
}

func newID() string {
	var bytes [6]byte
	if _, err := rand.Read(bytes[:]); err != nil {
		return fmt.Sprintf("chk_%d", time.Now().UnixNano())
	}
	return "chk_" + hex.EncodeToString(bytes[:])
}
