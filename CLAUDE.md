# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Public-facing storefront for a paid "цифровая подписка" service. A Go binary serves the React/Vite landing page from `web/` (embedded via `embed.FS`) and a small JSON API. On successful checkout the backend provisions a user in a Remnawave panel and returns the subscription URL straight to the browser.

The repository root that matters is [vpn_web/](.) — `main.go` lives here, `frontend/` is the React source, `web/` is the build output served by Go, `internal/` holds the Go packages. A `frontend/go.mod` file sits next to `package.json` but is unused; the Go module is rooted at `vpn_web/go.mod` (module name `access_web`).

## Common commands

All commands run from `vpn_web/`.

```bash
# Backend
go run .                       # serve API + embedded web/ on $APP_ADDR (default :8080)
go test ./...                  # run all Go tests
go test ./internal/checkout    # one package
go test ./internal/api -run TestCheckout   # one test
go vet ./...

# Frontend (one-time)
npm --prefix frontend install

# Frontend dev (proxies /api → :8080)
npm --prefix frontend run dev          # Vite on :5173
npm --prefix frontend run build        # tsc -b then vite build → emits to ../web/
npm --prefix frontend run build:watch  # rebuild ../web/ on change (pairs with `go run .`)
npm --prefix frontend run lint         # eslint
```

The Go binary `//go:embed web/*`, so a production-shaped run requires a fresh `npm run build` first; otherwise the embed contains stale output and there is no fallback to read from disk.

## Configuration

Loaded by [internal/config/config.go](internal/config/config.go) from `os.Environ()` first, then `.env` (process env wins). Notable behaviors:

- `REMNAWAVE_BASE_URL` is normalized and silently dropped if it points at `example.com` / `*.example.com` (treated as placeholder). `RemnawaveEnabled()` is false unless a non-placeholder base URL plus either `REMNAWAVE_TOKEN` or both `REMNAWAVE_USERNAME` + `REMNAWAVE_PASSWORD` are set.
- `CHECKOUT_ENABLED` also falls back to the legacy `PAYMENT_STUB_ENABLED` / `PAYMENT_STUB_PUBLIC_MOCK_ENABLED` keys.
- `REMNAWAVE_USER_TAG` is upper-cased, truncated to 16 chars of `[A-Z0-9_]`, and defaults to `WEB`.
- `REMNAWAVE_INTERNAL_SQUADS` is a comma-separated list of squad UUIDs assigned to every provisioned user.

## Architecture

### Request flow

1. `main.go` builds the dependency graph: `config.Load()` → `checkout.NewStore(DataDir)` → `remnawave.New(...)` → `checkout.NewService(store, remna, cfg)` → `api.NewServer(cfg, service, logger)`.
2. The root mux dispatches `/api/*` to [internal/api](internal/api) and everything else to the embedded `web/` filesystem.
3. Static handler ([main.go:62](main.go#L62)) rewrites unknown paths to `/` so client-side React Router URLs (`/features`, `/pricing`, `/checkout`) resolve to `index.html`. `/` is served with `Cache-Control: no-cache`.
4. Every response passes through `securityHeaders` in `main.go` (CSP, HSTS, COOP, frame-deny, etc.). The same set is applied a second time inside [internal/api/handlers.go](internal/api/handlers.go) `withSecurityHeaders` so API responses get the headers even if the outer middleware is bypassed in tests.
5. Local dev CORS is permitted only for `Origin` = `localhost`/`127.0.0.1`/`::1` on ports `5173`, `4173`, `5500-5505` (see `allowLocalDevCORS`). Any other origin is silently dropped — there is no general CORS support.

### Checkout pipeline

The interesting code path is `POST /api/checkout` → [internal/api/handlers.go](internal/api/handlers.go) `handleCheckout` → `checkout.Service.Start` → `Service.Provision` → `remnawave.Client.CreateUser` (+ optional `GetSubscriptionByUsername` fallback) → `store.Update`.

- Per-IP rate limit: 20 requests / 10 minutes via the in-memory `rateLimiter` ([internal/api/rate_limiter.go](internal/api/rate_limiter.go)).
- Currently only the trial plan accepts paid-flow inputs; any non-`trial` plan returns `paid_plans_disabled` (handlers.go around `plan.ID != checkout.TrialPlanID`). Adjust this guard when wiring a real payment provider — see "For real payments" in [README.md](README.md).
- Checkout records are persisted to `data/checkouts.json` via [internal/checkout/store.go](internal/checkout/store.go). The store creates `DataDir` with `0700` and writes the file with `0600`; never relax these or commit the file.
- `Service.Provision` always *attempts* to update the stored checkout with a status (`provisioned` / `failed`) and a sanitized error message even when Remnawave fails — failures use `errors.Join` so both the original cause and the store update error are surfaced.
- Plan catalog lives in [internal/checkout/plans.go](internal/checkout/plans.go) (`Plans` slice). `TrafficLimitGB = 0` means unlimited; `Devices` maps to Remnawave `hwidDeviceLimit`; `Duration()` is derived from the string `ProvisionDuration` so changes to durations stay JSON-serializable.
- The public response from `newCheckoutResponse` deliberately omits `Telegram`, `Email`, `Contact`, and internal `ProvisionError`. Keep this surface narrow when extending the response shape.

### Remnawave client

[internal/remnawave/client.go](internal/remnawave/client.go) is a thin REST client over `/api/users` and `/api/subscriptions/by-username/{username}`. `BaseURL` must be the panel origin only — no trailing `/api`, the client appends paths itself. Username generation is centralized in `remnawave.SuggestedUsername` so changing the slug strategy affects every callsite.

### Frontend

React 19 + Vite 8 + Tailwind v4 (via `@tailwindcss/vite`), router is `react-router-dom` v7, no separate state library.

- Entry: [src/main.tsx](frontend/src/main.tsx) → [src/App.tsx](frontend/src/App.tsx). Routes: `/`, `/features`, `/pricing`, `/checkout`, `*` → `HomePage`.
- Site-wide state is one context: [src/siteContext.tsx](frontend/src/siteContext.tsx) holds `config`, `plans`, and `theme` (light/dark, persisted in `localStorage` under `site-theme`, default from `prefers-color-scheme`). On mount it fetches `/api/config` + `/api/plans` in parallel via `Promise.allSettled` and falls back to [src/siteData.ts](frontend/src/siteData.ts) values if the API is down — so the page renders even when the backend is unreachable.
- Styling: Tailwind v4 with a large hand-tuned base in [src/index.css](frontend/src/index.css). There is no `tailwind.config.js` — design tokens live in CSS variables.
- API client: [src/api.ts](frontend/src/api.ts). `apiURL()` detects VS Code Live Server (`localhost`/`127.0.0.1` on ports 5500–5505) and rewrites `/api/*` to `http://localhost:8080/api/*`; in any other context it returns the relative path, so Vite's proxy (or Go directly) handles it. Mirror this list with `isAllowedDevPort` in `handlers.go` whenever ports change.
- Vite `base: './'` and `build.outDir: '../web'` are load-bearing: relative asset URLs let the embedded bundle work behind any reverse proxy path, and the build empties + writes directly into the location Go embeds.

## Project conventions

- **Brand language.** The site must not use the word "VPN" or anti-censorship terminology in user-facing copy, code comments visible in the bundle, or docs aimed at end users. Frame the product as "цифровая подписка". This applies to React strings, plan names, FAQ entries, marketing sections — anywhere a customer might read it. Backend log messages and internal Go identifiers are fine.
- **User-facing strings are in Russian** (error messages from `handleCheckout`, plan names, frontend copy). Keep that consistent when adding flows.
- **Public error shape.** Checkout errors return `{error: {code, message}}` with a stable `code` the frontend can branch on (`unknown_plan`, `paid_plans_disabled`, `consent_required`, `remnawave_not_configured`, `provision_failed`, …). Add new codes rather than reusing existing ones for different conditions.
- **Tests.** Each `internal/*` package has a `_test.go` neighbour; the checkout service tests use a fake `RemnawaveClient` (via the interface in `service.go`). Prefer extending those over adding integration tests that hit a live panel.
