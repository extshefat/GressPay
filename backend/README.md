# GressPay API (inside `GressPay- Web/backend`)

This is the GressPay PHP API. It is **not** a separate product folder. Nginx on the VPS sends `/api/` here and `/` to Next.js. See the parent `docker-compose.yml`.

## Run on the VPS (intended)

```bash
cp .env.example .env
# set JWT_SECRET, DB_PASS, CORS_ORIGINS, APP_URL
docker compose up -d --build
```

Nginx config: `deploy/nginx.conf`. Put Certbot on the API subdomain after DNS points here.

## One-off PHP check (not production)

From this folder, if PHP is installed:

```bash
php -S 0.0.0.0:8080 -t public
```

Then `GET http://127.0.0.1:8080/api/v1/health`. SQLite is created under `storage/` when `DB_DRIVER=sqlite`.

## Routes

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/v1/health` | none |
| POST | `/api/v1/auth/register` | none |
| POST | `/api/v1/auth/login` | none |
| GET | `/api/v1/me` | JWT |
| GET/POST | `/api/v1/payment-links` | JWT or API key |
| GET | `/api/v1/payment-links/:id` | JWT or API key |
| GET/POST | `/api/v1/invoices` | JWT or API key |
| GET | `/api/v1/invoices/:id` | JWT or API key |
| GET | `/api/v1/transactions` | JWT or API key |
| GET | `/api/v1/transactions/:id` | JWT or API key |
| GET | `/api/v1/methods` | JWT or API key |
| POST | `/api/v1/methods/:code/connect` | JWT or API key |
| DELETE | `/api/v1/methods/:code` | JWT or API key |
| GET | `/api/v1/rates` | JWT or API key |
| POST | `/api/v1/checkout/create` | JWT or API key |
| POST | `/api/v1/checkout/:linkId/init` | JWT or API key |
| GET | `/api/v1/checkout/:id/status` | JWT or API key |
| POST | `/api/v1/checkout/:id/verify` | JWT or API key |

Full notes: [GressPay-API.md](GressPay-API.md)
