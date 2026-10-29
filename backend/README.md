# GressPay API (`backend/`)

PHP 8.2+ REST API for GressPay. Nginx on the VPS sends `/api/` here and `/` to Next.js. See the parent `docker-compose.yml` and [`../COOLIFY_DEPLOYMENT.md`](../COOLIFY_DEPLOYMENT.md).

Production base: `https://gresspay.extxcheats.com/api/v1`

## Run on the VPS (intended)

```bash
cp .env.example .env
# set JWT_SECRET, DB_PASS, CORS_ORIGINS, APP_URL / PUBLIC_APP_URL
docker compose up -d --build
```

## One-off PHP check (not production)

```bash
php -S 0.0.0.0:8080 -t public
```

Then `GET http://127.0.0.1:8080/api/v1/health`. SQLite is used under `storage/` when `DB_DRIVER=sqlite`.

## Key routes

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/v1/health` | none |
| POST | `/api/v1/auth/register` | none |
| POST | `/api/v1/auth/login` | none |
| GET | `/api/v1/me` | JWT |
| **POST** | **`/api/v1/payment/create`** | JWT or API key (`create_payment`) |
| **POST** | **`/api/v1/payment/verify`** | JWT or API key (`verify_payment`) |
| **GET** | **`/api/v1/payment/status/:sessionId`** | JWT or API key (`verify_payment`) |
| POST | `/api/v1/checkout/create` | JWT or API key (same as payment/create) |
| POST | `/api/v1/checkout/:linkId/init` | public / session resume |
| GET | `/api/v1/checkout/:id/status` | JWT or API key |
| POST | `/api/v1/checkout/:id/verify` | buyer / rail verify |
| GET/POST | `/api/v1/payment-links` | JWT or API key |
| GET/POST | `/api/v1/invoices` | JWT or API key |
| GET | `/api/v1/transactions` | JWT or API key |
| GET/POST | `/api/v1/methods` | JWT or API key |
| GET | `/api/v1/rates` | JWT or API key |
| POST | `/api/v1/companion/register` | merchant API key |
| POST | `/api/v1/companion/sms` | device token |
| * | `/api/v1/admin/*` | platform admin |

Auth headers: `Authorization: Bearer …`, `X-API-Key`, or `X-GressPay-Key`.  
Webhooks: `X-GressPay-Signature` = HMAC-SHA256(raw body, webhook secret).

Public integration docs: `/developers` on the Next.js site.

## Tests

```bash
php tests/run.php
# From repo root: php backend/tests/run.php
```

Full notes: [GressPay-API.md](GressPay-API.md) · [docs/PHASE1_RAILS.md](docs/PHASE1_RAILS.md)
