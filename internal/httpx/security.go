package httpx

import "net/http"

// securityCSP — единая Content-Security-Policy для всех ответов (статика и API).
// Разрешает SDK Telegram (script-src telegram.org) и встраивание Mini App в
// веб-версию Telegram (frame-ancestors web.telegram.org). X-Frame-Options
// намеренно не задаётся: он не поддерживает несколько источников и конфликтует с
// frame-ancestors — встраиванием управляет CSP.
const securityCSP = "default-src 'self'; " +
	"script-src 'self' https://telegram.org; " +
	"style-src 'self' 'unsafe-inline'; " +
	"img-src 'self' data:; " +
	"connect-src 'self'; " +
	"frame-ancestors https://web.telegram.org https://telegram.org; " +
	"base-uri 'self'; form-action 'self'"

// SecurityHeaders применяет защитные HTTP-заголовки ко всем ответам. Это
// единственное место, где они задаются, чтобы копии не расходились при правках.
func SecurityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("Content-Security-Policy", securityCSP)
		h.Set("Cross-Origin-Opener-Policy", "same-origin")
		h.Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("Referrer-Policy", "strict-origin-when-cross-origin")
		h.Set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
		next.ServeHTTP(w, r)
	})
}
