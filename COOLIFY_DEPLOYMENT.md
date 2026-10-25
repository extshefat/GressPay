# Coolify deployment (GressPay)

Deploy from **GitHub → Coolify on your VPS**. Do not run PHP, JDK, MySQL, or Docker Desktop on your personal PC for production. This document does **not** deploy for you — configure Coolify manually.

## Services (no Redis)

| Coolify service | Source | Role |
|-----------------|--------|------|
| `gresspay-web` | [`GressPay- Web/Dockerfile`](GressPay-%20Web/Dockerfile) | Next.js (standalone), public HTTPS |
| `gresspay-api` | [`GressPay- Web/backend/Dockerfile`](GressPay-%20Web/backend/Dockerfile) | PHP HTTP API on `$PORT` |
| `gresspay-db` | Managed MySQL / MariaDB | Persistent volume required |

Redis is **not** used (rate limits use MySQL/`gp_rate_limit`). Do not add Redis.

## Platform environment variables (Coolify secrets)

Enter **only** platform/runtime settings on the API (and related keys on web):

```
APP_ENV=production
APP_URL=https://api.your-domain.com
PUBLIC_APP_URL=https://your-domain.com
CORS_ORIGINS=https://your-domain.com
DB_DRIVER=mysql
DB_HOST=<coolify-mysql-internal-host>
DB_PORT=3306
DB_NAME=gresspay
DB_USER=gresspay
DB_PASS=<strong-secret>
JWT_SECRET=<≥32 random characters>
APP_ENCRYPTION_KEY=<≥32 random characters>
GRESSPAY_CRYPTO_ALLOWED=0
BINANCE_PAY_API_BASE=https://bpay.binanceapi.com
TRON_API_BASE=https://api.trongrid.io
TRON_API_KEY=<optional platform TronGrid key>
USDT_TRC20_CONTRACT=TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t
USDT_CONFIRMATIONS=20
WEBHOOK_TIMEOUT_SECONDS=8
WEBHOOK_MAX_RETRIES=5
PORT=8080

# Google OAuth 2.0 / OpenID Connect (Optional)
# If omitted or empty, Google login button is cleanly disabled in the UI with a helpful tooltip.
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://your-domain.com/callback/google

# Cloudflare R2 — private bucket for merchant QR images (API service only)
R2_ACCOUNT_ID=
R2_BUCKET_NAME=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
R2_PRESIGN_TTL_SECONDS=300
R2_MAX_UPLOAD_BYTES=5242880
R2_PUBLIC_BASE_URL=
```

Web service:

```
HOSTNAME=0.0.0.0
PORT=3000
NEXT_PUBLIC_DATA_SOURCE=live
GRESSPAY_PHP_URL=http://<api-service-name>:8080
NEXT_PUBLIC_API_URL=
```

### Never put in Coolify env

- Merchant bKash / Nagad numbers  
- Merchant USDT receiving addresses  
- Merchant Binance API key / secret / certificate SN  
- Merchant webhook URLs (dashboard Settings)

Those are configured **after deploy** in the merchant dashboard and stored brand-scoped in MySQL (`gp_gateways` / `gp_methods.options`, sealed `gp_brands.binance_pay_json`). QR **bytes** live in R2; MySQL stores only object key + mime/size/checksum.

`TRON_API_KEY` is a platform TronGrid access key only — not a wallet.  
`USDT_TRC20_CONTRACT` is the network USDT contract constant — never a merchant receive address.  
`APP_ENCRYPTION_KEY` encrypts merchant Binance credentials at rest.

### Cloudflare R2 setup (optional QR uploads)

1. Create a **private** R2 bucket (do not make the whole bucket public).  
2. Create API tokens with least-privilege read/write on that bucket only.  
3. Set `R2_*` secrets on the **PHP API** Coolify service only — never on the Next.js web service, never `NEXT_PUBLIC_*`.  
4. Leave R2 blank to disable QR upload; gateways and SMS/on-chain still work.  
5. Checkout uses short-lived signed GET URLs for QR images (payer-visible for that checkout only).  
6. Rotate/revoke R2 tokens in Cloudflare + Coolify when needed.

## Networking

| URL | Purpose |
|-----|---------|
| Public `https://your-domain.com` | Next.js UI + same-origin `/api/v1` proxy |
| Public `https://api.your-domain.com` (optional) | Direct API if exposed; health `GET /api/v1/health` |
| Internal `http://gresspay-api:8080` | Web → API (`GRESSPAY_PHP_URL`) |
| Internal MySQL host | API → DB |

TLS terminates at Coolify. Force HTTPS for merchant credential forms.

## Health checks

- API: `GET /api/v1/health` → HTTP 200  
- Web: `GET /` → HTTP 200  

## Database & migrations

1. Create MySQL with a **persistent volume**.  
2. First API boot runs `GpDb::migrate()` + `GpDb::ensureExtras()` (schema + `binance_pay_json`, nonces, audit, indexes).  
3. Do **not** use SQLite in production (ephemeral disk).  
4. Optional volume for `storage/` logs only — never primary data.

## Crypto stays disabled until ready

Leave `GRESSPAY_CRYPTO_ALLOWED=0` until:

1. Strong secrets set  
2. Merchant enables crypto in Settings  
3. Merchant saves Binance credentials and/or USDT address on Methods  
4. You intentionally set `GRESSPAY_CRYPTO_ALLOWED=1`

## Merchant post-deploy checklist

1. Register / login → open **Settings** (platform vs merchant vs rail readiness).  
2. **Payment methods**: save bKash/Nagad numbers; USDT Base58 address; enable rails.  
3. **Settings → Binance Pay**: paste Merchant API key/secret/SN once → save → fields clear.  
4. **Devices**: register Android companion; grant RECEIVE_SMS; revoke from dashboard when needed.  
5. Create payment link → buyer checkout shows **this merchant’s** destination only.

### Rotate / disable

| Action | How |
|--------|-----|
| Rotate Binance credentials | Settings → save new key/secret/SN (overwrites sealed JSON) |
| Clear Binance | Settings → Clear credentials |
| Disable a rail | Methods → Disable |
| Clear wallet | Methods → Clear |
| Revoke companion | Devices → revoke |

## Verification (not on your PC)

- GitHub Actions: [`.github/workflows/verify.yml`](.github/workflows/verify.yml) (tsc, live build, PHP in container, Android Gradle).  
- After Coolify deploy: curl health endpoints.  
- Do not claim live Binance/Tron E2E without merchant credentials.

## Related

- [`DEPLOYMENT_CHECKLIST.md`](DEPLOYMENT_CHECKLIST.md)  
- [`GressPay- Web/backend/docs/PHASE1_RAILS.md`](GressPay-%20Web/backend/docs/PHASE1_RAILS.md)  
- [`GressPay- Web/backend/.env.example`](GressPay-%20Web/backend/.env.example)
