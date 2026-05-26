package config

import (
	"bufio"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Addr                    string
	PublicBaseURL           string
	BrandName               string
	SupportTelegramURL      string
	SupportEmail            string
	DataDir                 string
	RemnawaveBaseURL        string
	RemnawaveUsername       string
	RemnawavePassword       string
	RemnawaveToken          string
	RemnawaveTag            string
	RemnawaveInternalSquads []string
	RemnawaveRequestTimeout time.Duration
	CheckoutEnabled         bool
}

func Load() Config {
	_ = loadDotEnv(".env")
	remnawaveBaseURL := normalizeBaseURL(getEnv("REMNAWAVE_BASE_URL", ""))

	return Config{
		Addr:                    getEnv("APP_ADDR", ":8080"),
		PublicBaseURL:           strings.TrimRight(getEnv("PUBLIC_BASE_URL", "http://localhost:8080"), "/"),
		BrandName:               getEnv("SITE_BRAND_NAME", "FlowPass"),
		SupportTelegramURL:      getEnv("SUPPORT_TELEGRAM_URL", "https://t.me/bezgraniz_support_bot"),
		SupportEmail:            getEnv("SUPPORT_EMAIL", "support@example.com"),
		DataDir:                 getEnv("DATA_DIR", "data"),
		RemnawaveBaseURL:        remnawaveBaseURL,
		RemnawaveUsername:       getEnv("REMNAWAVE_USERNAME", ""),
		RemnawavePassword:       getEnv("REMNAWAVE_PASSWORD", ""),
		RemnawaveToken:          getEnv("REMNAWAVE_TOKEN", ""),
		RemnawaveTag:            normalizeTag(getEnv("REMNAWAVE_USER_TAG", "WEB")),
		RemnawaveInternalSquads: getCSVEnv("REMNAWAVE_INTERNAL_SQUADS"),
		RemnawaveRequestTimeout: getDurationEnv("REMNAWAVE_TIMEOUT", 12*time.Second),
		CheckoutEnabled:         getBoolEnv("CHECKOUT_ENABLED", getBoolEnv("PAYMENT_STUB_ENABLED", getBoolEnv("PAYMENT_STUB_PUBLIC_MOCK_ENABLED", false))),
	}
}

func normalizeBaseURL(rawURL string) string {
	rawURL = strings.TrimRight(strings.TrimSpace(rawURL), "/")
	if isPlaceholderURL(rawURL) {
		return ""
	}
	return rawURL
}

func isPlaceholderURL(rawURL string) bool {
	if rawURL == "" {
		return false
	}
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return false
	}
	host := strings.ToLower(parsed.Hostname())
	return host == "example.com" || strings.HasSuffix(host, ".example.com")
}

func loadDotEnv(path string) error {
	file, err := os.Open(path)
	if err != nil {
		return err
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		line = strings.TrimPrefix(line, "export ")
		key, value, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		key = strings.TrimSpace(key)
		if key == "" {
			continue
		}
		if _, exists := os.LookupEnv(key); exists {
			continue
		}
		_ = os.Setenv(key, parseDotEnvValue(value))
	}
	return scanner.Err()
}

func parseDotEnvValue(value string) string {
	value = strings.TrimSpace(value)
	if len(value) < 2 {
		return value
	}

	quote := value[0]
	if (quote != '"' && quote != '\'') || value[len(value)-1] != quote {
		return value
	}

	value = value[1 : len(value)-1]
	if quote == '"' {
		value = strings.ReplaceAll(value, `\n`, "\n")
		value = strings.ReplaceAll(value, `\"`, `"`)
		value = strings.ReplaceAll(value, `\\`, `\`)
	}
	return value
}

func (c Config) RemnawaveEnabled() bool {
	if c.RemnawaveBaseURL == "" {
		return false
	}
	if c.RemnawaveToken != "" {
		return true
	}
	return c.RemnawaveUsername != "" && c.RemnawavePassword != ""
}

func getEnv(key, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	return value
}

func getBoolEnv(key string, fallback bool) bool {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback
	}
	value, err := strconv.ParseBool(raw)
	if err != nil {
		return fallback
	}
	return value
}

func getDurationEnv(key string, fallback time.Duration) time.Duration {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback
	}
	value, err := time.ParseDuration(raw)
	if err != nil {
		return fallback
	}
	return value
}

func getCSVEnv(key string) []string {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return nil
	}
	parts := strings.Split(raw, ",")
	values := make([]string, 0, len(parts))
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part != "" {
			values = append(values, part)
		}
	}
	return values
}

func normalizeTag(tag string) string {
	tag = strings.ToUpper(strings.TrimSpace(tag))
	if tag == "" {
		return "WEB"
	}
	var b strings.Builder
	for _, r := range tag {
		if (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '_' {
			b.WriteRune(r)
			if b.Len() >= 16 {
				break
			}
		}
	}
	if b.Len() == 0 {
		return "WEB"
	}
	return b.String()
}
