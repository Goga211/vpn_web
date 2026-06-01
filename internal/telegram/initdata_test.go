package telegram

import (
	"encoding/hex"
	"net/url"
	"strconv"
	"testing"
	"time"
)

// signInitData собирает валидную подписанную строку initData для тестов.
func signInitData(botToken string, authDate time.Time, userJSON string) string {
	values := url.Values{}
	values.Set("auth_date", strconv.FormatInt(authDate.Unix(), 10))
	values.Set("user", userJSON)

	// data-check-string: ключи отсортированы, пары key=value через \n.
	dcs := "auth_date=" + values.Get("auth_date") + "\n" + "user=" + values.Get("user")

	secret := hmacSHA256([]byte("WebAppData"), []byte(botToken))
	hash := hex.EncodeToString(hmacSHA256(secret, []byte(dcs)))
	values.Set("hash", hash)
	return values.Encode()
}

func TestValidateInitDataHappyPath(t *testing.T) {
	const token = "test-bot-token"
	initData := signInitData(token, time.Now(), `{"id":12345,"first_name":"Test","username":"johndoe"}`)

	user, err := ValidateInitData(initData, token, 24*time.Hour)
	if err != nil {
		t.Fatalf("ValidateInitData() error = %v", err)
	}
	if user.ID != 12345 {
		t.Fatalf("telegram id = %d, want 12345", user.ID)
	}
	if user.Username != "johndoe" {
		t.Fatalf("telegram username = %q, want johndoe", user.Username)
	}
}

func TestValidateInitDataRejectsBadSignature(t *testing.T) {
	initData := signInitData("real-token", time.Now(), `{"id":1}`)
	if _, err := ValidateInitData(initData, "wrong-token", 24*time.Hour); err == nil {
		t.Fatal("ValidateInitData() error = nil, want signature error")
	}
}

func TestValidateInitDataRejectsExpired(t *testing.T) {
	const token = "test-bot-token"
	initData := signInitData(token, time.Now().Add(-48*time.Hour), `{"id":1}`)
	if _, err := ValidateInitData(initData, token, 24*time.Hour); err == nil {
		t.Fatal("ValidateInitData() error = nil, want expiry error")
	}
}

func TestValidateInitDataRejectsEmpty(t *testing.T) {
	if _, err := ValidateInitData("", "token", time.Hour); err == nil {
		t.Fatal("ValidateInitData() error = nil, want error for empty initData")
	}
}
