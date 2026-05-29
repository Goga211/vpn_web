# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Public-facing VPN subscription storefront. A Go binary serves a React/Vite landing page and a small JSON API; the checkout flow provisions access automatically through the **Remnawave** panel API. The Go module is named `access_web` (the repo directory is `vpn_web`).

## Commands

```bash
# First-time setup
cp .env.example .env
npm --prefix frontend install

# Build the frontend bundle into web/ (required before `go run .` picks up UI changes)
npm --prefix frontend run build

# Run the full app (Go serves the embedded web/ bundle and the API on :8080)
go run .

# Frontend dev server with HMR (proxies /api -> http://localhost:8080, so run `go run .` too)
npm --prefix frontend run dev

# Rebuild web/ on every change (for Live Server / Go-only preview)
npm --prefix frontend run build:watch

# Lint frontend
npm --prefix frontend run lint

# Go tests (all packages, or a single test)
go test ./...
go test ./internal/checkout -run TestServiceProvision

# Frontend type-check + build is part of `npm run build` (`tsc -b && vite build`)
```

There is no Makefile or task runner — use the raw `go` and `npm --prefix frontend` commands above.

## Architecture

**Build/serve coupling:** `main.go` embeds the `web/` directory via `//go:embed web/*`. The frontend (`frontend/`) builds *into* `web/` (`vite.config.ts` sets `outDir: '../web'`). So `web/` is generated output that ships inside the binary — edit `frontend/`, then rebuild. `staticHandler` serves files and falls back to `/` (index.html) for unknown paths (SPA routing).

**Request pipeline (`main.go`):** `logRequests` → `securityHeaders` → mux. The mux splits `/api/` (handled by `internal/api`) from everything else (static handler). Security headers (CSP, HSTS, X-Frame-Options, etc.) are applied in both `main.go` and `internal/api` (the API layer re-applies them plus dev CORS).

**API layer (`internal/api/handlers.go`):** Exposes exactly four routes — `GET /api/health`, `GET /api/config`, `GET /api/plans`, `POST /api/checkout`. `handleCheckout` validates input (consent required, email/telegram length + format, at least one contact), enforces a per-IP rate limit (`rate_limiter.go`, 20 req / 10 min), and currently **only allows the `trial` plan** — paid plans are rejected with `paid_plans_disabled`. `allowLocalDevCORS` permits CORS only for localhost origins on known Vite/Live-Server dev ports (5173, 4173, 5500–5505).

**Checkout flow (`internal/checkout/`):**
- `plans.go` — hardcoded `Plans` slice; `trial` is the only provisionable plan (`TrialPlanID`).
- `store.go` — JSON-file persistence in `DATA_DIR/checkouts.json` (default `data/`), with statuses `paid` → `provisioned` / `failed`. This is local history, not a real DB.
- `service.go` — `Start` creates a checkout record then `Provision`s it: derives a username, calls Remnawave `CreateUser` with plan-derived traffic/expiry/device limits, then resolves the subscription URL (falling back to `GetSubscriptionByUsername`). Failures mark the checkout `failed` with a sanitized, user-safe message.

**Remnawave client (`internal/remnawave/client.go`):** Talks to the upstream panel. Auth is either a static `REMNAWAVE_TOKEN` or username/password (the client fetches and caches a token via `getToken`). `Enabled()` gates the whole provisioning path — if Remnawave isn't configured, checkout returns `remnawave_not_configured` and the record is marked failed.

**Config (`internal/config/config.go`):** `Load()` reads `.env` itself (custom parser; real env vars take priority) and applies defaults. URLs pointing at `example.com` are treated as unset placeholders. `RemnawaveEnabled()` requires a base URL plus either a token or user/password.

## Important notes

- **`web/` is build output** — don't hand-edit it; change `frontend/` and rebuild.
- The Go binary won't reflect frontend changes until `npm --prefix frontend run build` regenerates `web/`.
- Paid plans are intentionally disabled at the API; only the trial provisions today.
- `.env` and `data/` are gitignored; never commit them.
- Telegram Mini App integration (per `SITE_INTEGRATION.md`) is **implemented**: the frontend loads `telegram-web-app.js` and sends `initData`; the backend verifies it in `internal/telegram` (signature + replay window) and writes `telegramId` to Remnawave. `initData` is **optional** — empty (browser) checkout still works without Telegram binding. Repeat checkouts for a known `telegramId` **renew** the existing Remnawave user (PATCH) instead of creating duplicates. Set `TELEGRAM_BOT_TOKEN` in `.env` (= the bot's token) for verification to work.
- `frontend/` requires **Node 20.19+ / 22.12+** (Vite 8). On older Node the `tsc` type-check still runs but `vite build` fails — the embedded `web/` bundle can only be regenerated on a supported Node version.
