# Coolify deployment (GressPay)

Deploy from **GitHub → Coolify on your VPS**. Do not run PHP, JDK, MySQL, or Docker Desktop on your personal PC for production. This document does **not** deploy for you — configure Coolify manually.

## Services (no Redis)

| Coolify service | Source | Role |
|-----------------|--------|------|
| `gresspay-web` | root [`Dockerfile`](Dockerfile) | Next.js (standalone), public HTTPS |
| `gresspay-api` | [`backend/Dockerfile`](backend/Dockerfile) | PHP HTTP API on `$PORT` (default 8080) |
| `gresspay-db` | Managed MySQL / MariaDB | Persistent volume required |

Redis is **not** used (rate limits use MySQL/`gp_rate_limit`). Do not add Redis.

## Emergency: Cloudflare 502 (Host error)

Cloudflare 502 with **Host = Error** means Coolify’s proxy cannot reach a running container. GitHub merges alone do not fix that until Coolify **successfully rebuilds and starts** the app.

### Do this in Coolify (in order)

1. Open the **gresspay** application that serves `gresspay.extxcheats.com`.
2. Open the latest **Deployment** → read the build/runtime log for red errors (OOM, bind port, missing env, image build fail).
3. Click **Redeploy** and enable **Force rebuild** / disable build cache if the option exists.
4. Confirm containers are **Running** (not Exited / Unhealthy):
   - Web must listen on **3000**
   - API must listen on **8080** (or whatever `PORT` you set on the API service)
5. From Coolify’s container terminal (or VPS SSH):
   ```bash
   curl -sS http://127.0.0.1:3000/ | head
   curl -sS http://127.0.0.1:8080/api/v1/health
   curl -sS http://127.0.0.1:8080/api/v1/health/worker
   ```
6. Confirm env on **web**: `GRESSPAY_PHP_URL=http://<api-service-name>:8080`
7. Confirm env on **api**: `JWT_SECRET`, `APP_ENCRYPTION_KEY`, `DB_*`, `PORT=8080`

If deploy status is **Failed**, the public site will stay 502 until that deploy is green—no amount of Cloudflare refresh will help.

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
GRESSPAY_SMS_AUTO_ALLOWED=0
BINANCE_PAY_API_BASE=https://bpay.binanceapi.com
TRON_API_BASE=https://api.trongrid.io
TRON_API_KEY=<optional platform TronGrid key>
USDT_TRC20_CONTRACT=TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t
USDT_CONFIRMATIONS=20
WEBHOOK_TIMEOUT_SECONDS=8
WEBHOOK_MAX_RETRIES=5
PORT=8080

# Google OAuth 2.0 / OpenID Connect (Optional)
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
- Worker queue: `GET /api/v1/health/worker` → HTTP 200 when no stale `processing` rows; body includes `queuePending`, `queueFailed`, `lastDeliveredAt` (no secrets)  
- Web: `GET /` → HTTP 200  
- Keep `webhook-worker` as its own Coolify service (`php jobs/WebhookWorker.php`); a green web health check does not prove the worker is running.

## Database & migrations

1. Inspect the deployed database driver and preserve it. The block above is a MySQL example; for an existing PostgreSQL installation use `DB_DRIVER=pgsql`, its existing host and `DB_PORT=5432`. Never switch engines as part of an app deploy.  
2. Take a verified database backup and rehearse restore and schema changes on staging before the first upgraded API boot. First boot runs `GpDb::migrate()` + `GpDb::ensureExtras()` and seals legacy webhook secrets. Check existing SMS TxID duplicates before adding the new unique indexes.  
3. Do **not** use SQLite in production (ephemeral disk).  
4. Optional volume for `storage/` logs only — never primary data.

Run `php jobs/WebhookWorker.php` as a separate continuously running service using the same API environment. A failed first webhook attempt is queued; confirm retry history and worker health before enabling merchant fulfillment.

The updated Android companion sends the original SMS receipt timestamp. Publish a release-signed APK built with the existing signing identity before enabling live SMS verification on this API version. Leave `GRESSPAY_SMS_AUTO_ALLOWED=0`; TxID remains required for the first release.

## Crypto stays disabled until ready

Leave `GRESSPAY_CRYPTO_ALLOWED=0` until:

1. Strong secrets set  
2. Merchant enables crypto in Settings  
3. Merchant saves Binance credentials and/or USDT address on Methods  

## Phase 1: trusted client addresses

Do not expose Next or the API directly to the Internet. Next's App Router does not
expose the TCP peer: it can only trust an ingress-controlled XFF chain. Configure
Traefik forwardedHeaders.trustedIPs for the actual preceding load balancer, never
forwardedHeaders.insecure. Verify its resulting XFF chain in your deployment
before setting the web container's TRUSTED_PROXY_HOPS (count from the right).
The supplied edge nginx overwrites XFF with its socket peer, so web hops=1 is
correct only when that socket peer is the real client. Behind Traefik, configure
nginx real_ip with that proxy's precise CIDRs first, or count the verified chain.
With web hops=0 (default), all proxy requests share a fail-closed rate bucket.

PHP accepts X-GressPay-Client-IP only when REMOTE_ADDR is in TRUSTED_NEXT_PROXIES:
set this to the Next container's dedicated address, never a shared public subnet.
TRUSTED_PROXIES and TRUSTED_PROXY_HOPS govern direct API ingress XFF separately;
leave empty/0 if unused. The internal API must be unreachable to untrusted
containers. Never put an Internet-wide CIDR in either trust list. Next drops all
inbound client-IP headers and sends only its selected internal header. In the
FPM image nginx passes the original socket peer to PHP; do not real_ip rewrite
that internal listener. Changing container addressing requires updating trust.
