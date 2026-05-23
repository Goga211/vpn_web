package main

import (
	"embed"
	"io/fs"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"

	"access_web/internal/api"
	"access_web/internal/checkout"
	"access_web/internal/config"
	"access_web/internal/remnawave"
)

//go:embed web/*
var webFiles embed.FS

func main() {
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	cfg := config.Load()

	store, err := checkout.NewStore(cfg.DataDir)
	if err != nil {
		logger.Error("init checkout store", "err", err)
		os.Exit(1)
	}

	remna := remnawave.New(remnawave.Config{
		BaseURL:  cfg.RemnawaveBaseURL,
		Username: cfg.RemnawaveUsername,
		Password: cfg.RemnawavePassword,
		Token:    cfg.RemnawaveToken,
		Timeout:  cfg.RemnawaveRequestTimeout,
	})

	checkoutService := checkout.NewService(store, remna, checkout.ServiceConfig{
		RemnawaveTag:         cfg.RemnawaveTag,
		ActiveInternalSquads: cfg.RemnawaveInternalSquads,
	})

	apiServer := api.NewServer(cfg, checkoutService, logger)
	mux := http.NewServeMux()
	mux.Handle("/api/", apiServer.Routes())
	mux.Handle("/", staticHandler(logger))

	server := &http.Server{
		Addr:              cfg.Addr,
		Handler:           logRequests(logger, securityHeaders(mux)),
		ReadHeaderTimeout: 5 * time.Second,
	}

	logger.Info("starting web app", "addr", cfg.Addr, "brand", cfg.BrandName, "remnawave", cfg.RemnawaveEnabled())
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		logger.Error("server stopped", "err", err)
		os.Exit(1)
	}
}

func staticHandler(logger *slog.Logger) http.Handler {
	sub, err := fs.Sub(webFiles, "web")
	if err != nil {
		logger.Error("static files", "err", err)
		os.Exit(1)
	}
	fileServer := http.FileServer(http.FS(sub))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/")
		if path == "" || !hasFile(sub, path) {
			r.URL.Path = "/"
		}
		if r.URL.Path == "/" {
			w.Header().Set("Cache-Control", "no-cache")
		}
		fileServer.ServeHTTP(w, r)
	})
}

func hasFile(fsys fs.FS, name string) bool {
	file, err := fsys.Open(name)
	if err != nil {
		return false
	}
	defer file.Close()
	stat, err := file.Stat()
	return err == nil && !stat.IsDir()
}

func logRequests(logger *slog.Logger, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		logger.Info("request", "method", r.Method, "path", r.URL.Path, "duration", time.Since(start))
	})
}

func securityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'")
		w.Header().Set("Cross-Origin-Opener-Policy", "same-origin")
		w.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		w.Header().Set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
		next.ServeHTTP(w, r)
	})
}
