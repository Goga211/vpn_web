package telegram

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"time"
)

// ValidateInitData проверяет подпись Telegram WebApp initData и возвращает Telegram ID.
// Алгоритм: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
func ValidateInitData(initData, botToken string, maxAge time.Duration) (int64, error) {
	if initData == "" || botToken == "" {
		return 0, errors.New("empty initData or bot token")
	}
	values, err := url.ParseQuery(initData)
	if err != nil {
		return 0, err
	}
	hash := values.Get("hash")
	if hash == "" {
		return 0, errors.New("no hash in initData")
	}
	values.Del("hash")

	keys := make([]string, 0, len(values))
	for k := range values {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	var sb strings.Builder
	for i, k := range keys {
		if i > 0 {
			sb.WriteByte('\n')
		}
		sb.WriteString(k + "=" + values.Get(k))
	}

	// secret = HMAC_SHA256(key="WebAppData", data=botToken)
	secret := hmacSHA256([]byte("WebAppData"), []byte(botToken))
	// expected = HMAC_SHA256(key=secret, data=dataCheckString)
	expected := hex.EncodeToString(hmacSHA256(secret, []byte(sb.String())))
	if !hmac.Equal([]byte(expected), []byte(hash)) {
		return 0, errors.New("bad initData signature")
	}

	// Защита от повторного использования (replay).
	if maxAge > 0 {
		if authDate, err := strconv.ParseInt(values.Get("auth_date"), 10, 64); err == nil {
			if time.Since(time.Unix(authDate, 0)) > maxAge {
				return 0, errors.New("initData expired")
			}
		}
	}

	var user struct {
		ID int64 `json:"id"`
	}
	if err := json.Unmarshal([]byte(values.Get("user")), &user); err != nil || user.ID == 0 {
		return 0, errors.New("no user id in initData")
	}
	return user.ID, nil
}

func hmacSHA256(key, data []byte) []byte {
	h := hmac.New(sha256.New, key)
	h.Write(data)
	return h.Sum(nil)
}
