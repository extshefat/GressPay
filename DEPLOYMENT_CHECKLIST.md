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

## E. Merchant configuration (dashboard)

- [ ] Create merchant account
- [ ] Settings: business name, webhook HTTPS URL, crypto opt-in when ready
- [ ] Gateways: add one or more bKash/Nagad/USDT instances; upload QR if R2 configured
- [ ] Settings: Binance Pay Merchant credentials → encrypted; form cleared
- [ ] Confirm checkout shows correct gateway destination + QR; scanning QR ≠ paid
- [ ] Companion device registered; revoke tested
- [ ] Test payment link shows **this** merchant’s destination

## F. Enable crypto (optional)

- [ ] Operator sets `GRESSPAY_CRYPTO_ALLOWED=1`
- [ ] Merchant crypto enabled + destinations/credentials ready
- [ ] Confirm rail “Live-ready” badges
- [ ] Manual Binance/Tron smoke with real credentials (owner-owned)

## G. Explicit non-goals

- [ ] Not installed PHP/JDK on personal PC for this deploy
- [ ] Not using Render
- [ ] Not committing `.env` files
