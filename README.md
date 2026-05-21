# VPN Web

Production-oriented VPN storefront with a Go backend, static frontend, checkout flow, and automatic subscription provisioning through the Remnawave API.

The site is designed as a public-facing landing page: users choose a plan, leave Telegram or email, complete checkout, and receive a subscription page link in the browser.

## Features

- Responsive VPN landing page with pricing, FAQ, support links, and checkout form.
- Static frontend served directly by the Go binary; no Node.js build step.
- Checkout endpoint with validation, rate limiting, and safe public responses.
- Automatic Remnawave user creation via `/api/users`.
- Subscription link fallback lookup via `/api/subscriptions/by-username/{username}`.
- Optional assignment to Remnawave Internal Squads.
- Local checkout history stored in `data/checkouts.json`.
- Security headers for HTML/API responses: CSP, HSTS, `X-Frame-Options`, `nosniff`, and referrer policy.

## Project Structure

```text
.
├── main.go                    # app entrypoint, static files, HTTP server
├── web/                       # static frontend
├── internal/api/              # HTTP API handlers and rate limiter
├── internal/checkout/         # plans, checkout storage, provisioning service
├── internal/config/           # env and .env configuration
└── internal/remnawave/        # Remnawave API client
```

## Requirements

- Go 1.22+
- Remnawave panel with API access
- Configured Remnawave nodes, hosts/inbounds, and squads as needed

## Quick Start

```bash
cp .env.example .env
go run .
```

Open:

```text
http://localhost:8080
```

The app loads `.env` automatically. Environment variables already set in the shell, Docker, or systemd have priority over `.env`.

## Configuration

Main variables:

```env
APP_ADDR=:8080
PUBLIC_BASE_URL=http://localhost:8080
SITE_BRAND_NAME=NorthVPN
SUPPORT_TELEGRAM_URL=https://t.me/your_vpn_support
SUPPORT_EMAIL=support@example.com
DATA_DIR=data
CHECKOUT_ENABLED=true
```

Remnawave can be configured with username/password:

```env
REMNAWAVE_BASE_URL=https://panel.your-domain.com
REMNAWAVE_USERNAME=admin
REMNAWAVE_PASSWORD=secret
REMNAWAVE_TOKEN=
```

Or with a token:

```env
REMNAWAVE_BASE_URL=https://panel.your-domain.com
REMNAWAVE_USERNAME=
REMNAWAVE_PASSWORD=
REMNAWAVE_TOKEN=your-token
```

Optional Remnawave settings:

```env
REMNAWAVE_USER_TAG=WEB
REMNAWAVE_INTERNAL_SQUADS=uuid-1,uuid-2
REMNAWAVE_TIMEOUT=12s
```

`REMNAWAVE_BASE_URL` must be the panel origin only, without `/api` at the end.

## Checkout Behavior

`CHECKOUT_ENABLED=true` enables the checkout endpoint. At the moment, payment confirmation is represented by the built-in checkout flow. When a user submits the form, the backend immediately attempts to create a Remnawave user and returns the subscription URL.

For real payments, add a payment provider and call the provisioning service only after a verified payment webhook.

## API

```text
GET  /api/health
GET  /api/config
GET  /api/plans
POST /api/checkout
```

Example checkout request:

```bash
curl -sS -X POST http://localhost:8080/api/checkout \
  -H 'Content-Type: application/json' \
  -d '{"planId":"trial","telegram":"@test_user","email":"test@example.com","consent":true}' | jq .
```

Successful response includes:

```json
{
  "checkout": {
    "id": "chk_...",
    "planName": "Пробный",
    "priceRub": 0,
    "status": "provisioned",
    "subscriptionUrl": "https://..."
  }
}
```

Public API responses intentionally do not expose user contact fields or internal provisioning errors.

## Plans

Plans are defined in:

```text
internal/checkout/plans.go
```

Each plan controls price, duration, traffic limit, and device limit. Device limit is passed to Remnawave as `hwidDeviceLimit`; traffic limit is passed as `trafficLimitBytes`.

## Security Notes

- Do not commit `.env`.
- Use HTTPS in production.
- Keep Remnawave credentials or tokens private.
- Keep `data/checkouts.json` private; it contains checkout metadata and subscription links.
- The app writes checkout storage with `0600` permissions and creates `DATA_DIR` with `0700`.
- The public checkout response is sanitized and does not include Telegram, email, comments, or internal errors.
- `panel.example.com` is treated as a placeholder and ignored by config loading.

## Verification

Run tests:

```bash
go test ./...
go vet ./...
```

Check runtime config:

```bash
curl -s http://localhost:8080/api/config | jq .
```

Expected when Remnawave is configured:

```json
{
  "checkoutEnabled": true,
  "provisioningEnabled": true
}
```
