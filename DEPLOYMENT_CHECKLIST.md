# GressPay deployment checklist (Coolify)

Complete in order. **Do not deploy from this checklist automatically** — use Coolify UI after code is on GitHub.

## A. Source & CI

- [ ] Push to GitHub (no `.env`, no secrets, no merchant wallets in repo)
- [ ] Confirm Actions workflow `.github/workflows/verify.yml` is green (web + PHP + Android)
- [ ] Confirm `.env.example` files list **platform** vars only

## B. Coolify services

- [ ] MySQL/MariaDB with persistent volume
- [ ] `gresspay-api` from `GressPay- Web/backend` Dockerfile; health `/api/v1/health`
- [ ] `gresspay-web` from `GressPay- Web` Dockerfile; `NEXT_PUBLIC_DATA_SOURCE=live`
- [ ] Internal `GRESSPAY_PHP_URL` points at API service
- [ ] Public HTTPS domains + `CORS_ORIGINS` / `PUBLIC_APP_URL` / `APP_URL`
- [ ] **No Redis** service

## C. Platform secrets (Coolify env)

- [ ] `JWT_SECRET` ≥32
- [ ] `APP_ENCRYPTION_KEY` ≥32
- [ ] `DB_PASS` strong
- [ ] `GRESSPAY_CRYPTO_ALLOWED=0` initially
- [ ] `GRESSPAY_SMS_AUTO_ALLOWED=0` until amount-only matching passes ambiguous-session tests
- [ ] Optional `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` (if enabling Google OAuth)
- [ ] Optional `TRON_API_KEY` (platform TronGrid only)
- [ ] Optional R2 vars on **API only** (`R2_ACCOUNT_ID`, `R2_BUCKET_NAME`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`, …)
- [ ] Private R2 bucket (never public whole-bucket)
- [ ] **No** merchant Binance key/secret/SN in env
- [ ] **No** bKash/Nagad/USDT wallet addresses or QR files in env/repo

## D. First boot

- [ ] API starts; schema migrate + ensureExtras succeed
- [ ] Health check OK
- [ ] Web loads without DEMO banner (`NEXT_PUBLIC_DATA_SOURCE=live`)

## E. Business configuration (dashboard)

- [ ] Create business account
- [ ] Settings: business name, alerts; webhook URL under **Webhooks & delivery**
- [ ] Gateways: add bKash/Nagad/USDT instances; Binance Pay credentials on **Payment Gateways** only
- [ ] Brands: upload checkout logo per brand
- [ ] Confirm checkout shows correct gateway destination + QR; scanning QR ≠ paid
- [ ] Companion device registered; revoke tested
- [ ] Companion release APK (`app_name` GressPay) sends original SMS timestamp
- [ ] Webhook worker runs continuously; failed delivery retries and history checked
- [ ] Test payment link shows **this** brand’s destination

## E2. Release finishing gates (2026-11 polish)

- [ ] Dark header uses theme tokens (no white sticky bar flash)
- [ ] Business OS wording; admin badge BUSINESS; Team nav owner-only
- [ ] Homepage: Automated message verify for Asia; Live vs Preview rails
- [ ] SMS unique index present after migrate; `bdMobileWalletCodes` = core MFS only
- [ ] CI verify.yml green after push (do not run PHP/Gradle on laptop)

## F. Enable crypto (optional)

- [ ] Operator sets `GRESSPAY_CRYPTO_ALLOWED=1`
- [ ] Merchant crypto enabled + destinations/credentials ready
- [ ] Confirm rail “Live-ready” badges
- [ ] Manual Binance/Tron smoke with real credentials (owner-owned)

## H. Backup & restore (runbook)

Additive ops checklist — rehearse on staging before production schema changes.

### Backup
- [ ] Coolify DB volume snapshot / provider backup enabled
- [ ] Logical dump (pick driver):
  - PostgreSQL: `pg_dump -Fc -h $DB_HOST -U $DB_USER $DB_NAME > gresspay-$(date -u +%Y%m%d).dump`
  - MySQL/MariaDB: `mysqldump -h $DB_HOST -u $DB_USER -p$DB_PASS $DB_NAME > gresspay-$(date -u +%Y%m%d).sql`
- [ ] Store dump off-box (object storage / encrypted drive); never commit dumps to git
- [ ] Note current git SHA / Coolify deploy id with the dump

### Restore order
1. Stop or scale down **webhook-worker** (avoid double-sends during restore)
2. Restore database from dump onto a fresh volume / staging DB
3. Start **gresspay-api** (PHP) and confirm `GET /api/v1/health` → 200
4. Confirm `GET /api/v1/health/worker` returns queue stats (503 only if stale `processing` rows)
5. Start **webhook-worker**, then **gresspay-web**
6. Smoke: login, open Reconciliation, confirm a known completed session still reads correctly

### Verify after restore
- [ ] `SELECT COUNT(*) FROM gp_transactions` / `gp_sms_data` sane vs pre-backup notes
- [ ] Unique SMS indexes still present (`uq_gp_sms_brand_trx` / PG `uq_gp_sms_brand_trx_lower`)
- [ ] No merchant secrets in API JSON responses

## G. Explicit non-goals

- [ ] Not installed PHP/JDK on personal PC for this deploy
- [ ] Not using Render
- [ ] Not committing `.env` files
