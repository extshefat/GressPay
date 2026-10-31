# GressPay

**Non-custodial payment automation for Bangladesh MFS + crypto.**  
Production: [https://gresspay.extxcheats.com](https://gresspay.extxcheats.com)

Customers pay **directly into wallets you configure**. GressPay never holds funds. Verification comes from companion SMS match (MFS), Binance Pay API, Bybit Pay, or on-chain USDT TRC-20 — never from a frontend button alone.

---

## What ships today

| Area | Status |
|------|--------|
| SaaS marketing homepage | Live demo checkout, rail coverage, pricing, companion showcase |
| Pricing (`/fees`) | Starter / Pro / Enterprise Lifetime · Monthly/Yearly (−20%) · BDT/USD · `?plan=` signup |
| Developer hub (`/developers`) | Stripe-style docs · production API base · cURL / PHP / Laravel / Node / WordPress |
| Hosted checkout (`/pay/{sessionId}`) | Multi-rail buyer UI · QR for crypto · TrxID verify |
| Dashboard | Overview, gateways (library + account types), brands, devices, transactions, payment links, invoices, settings, webhooks, team |
| Platform admin (`/admin`) | Account control, lifetime unlock, readiness |
| Android companion | Website-matched launcher icon · pairing · SMS match (~1s) · inbox backfill · APK `v1.1.0` |
| PHP REST API (`/api/v1`) | Auth, checkout/payment aliases, webhooks (HMAC), companion, admin |

---

## Supported rails

### Bangladesh MFS (direct-to-wallet)

| Rail | Verification |
|------|----------------|
| **bKash** | Companion SMS · TrxID + amount |
| **Nagad** | Companion SMS · TrxID + amount |
| **Rocket** | Companion SMS · TrxID + amount |
| **Upay** | Companion SMS · TrxID + amount |
| **Cellfin** | Companion SMS · TrxID + amount |

### Crypto

| Rail | Verification |
|------|----------------|
| **USDT TRC-20** | TronGrid on-chain confirmations |
| **Binance Pay** | Official Binance Pay order API |
| **Bybit Pay** | Provider order verification |

OTP / promo SMS are rejected by the companion parser and never uploaded.

---

## Repository layout

```
.
├── src/app/                    # Next.js 15 App Router
│   ├── (marketing)/            # Homepage, /fees, /developers, legal
│   ├── (dashboard)/            # User dashboard + /admin
│   ├── (auth)/                 # Login, register, Google callback
│   └── pay/[linkId]/           # Hosted checkout
├── src/features/               # UI modules (marketing, checkout, auth, …)
├── backend/                    # PHP 8.2+ REST API (vanilla)
│   ├── src/                    # Controllers, providers, lib
│   ├── tests/run.php           # Unit suite
│   └── docs/                   # Rails notes
├── GressPay-App-Project/       # Android companion (Kotlin)
├── public/download/            # gresspay-companion.apk
├── deploy/                     # Nginx / Docker helpers
├── docker-compose.yml
└── COOLIFY_DEPLOYMENT.md
```

---

## Stack

- **Frontend:** Next.js 15 · React 19 · Tailwind CSS · TypeScript  
- **API:** PHP 8.2+ · MySQL/MariaDB (production) or SQLite (local tests)  
- **Companion:** Kotlin · WorkManager · EncryptedSharedPreferences · `dataSync` FGS  
- **Deploy:** Coolify on self-hosted VPS · Docker Compose · Nginx reverse proxy  

Multi-tenant isolation is by `brand_id`. Provider credentials are encrypted at rest (AES-256-GCM).

---

## Production URLs

| Surface | URL |
|---------|-----|
| App / marketing | `https://gresspay.extxcheats.com` |
| API base | `https://gresspay.extxcheats.com/api/v1` |
| Hosted pay | `https://gresspay.extxcheats.com/pay/{sessionId}` |
| Companion APK | `https://gresspay.extxcheats.com/download/gresspay-companion.apk` |
| Docs | `https://gresspay.extxcheats.com/developers` |
| Pricing | `https://gresspay.extxcheats.com/fees` |

### Website payment aliases (recommended)

| Method | Path | Scope |
|--------|------|--------|
| `POST` | `/payment/create` | `create_payment` |
| `POST` | `/payment/verify` | `verify_payment` |
| `GET` | `/payment/status/{session_id}` | `verify_payment` |

Auth: `Authorization: Bearer gp_live_…` (or `X-API-Key` / `X-GressPay-Key`).  
Webhooks: HMAC-SHA256 of the raw body in `X-GressPay-Signature`.

Same handlers exist under `/checkout/*`. Prefer `/payment/*` in integrations.

---

## Pricing plans (product)

| Plan | Price | Highlights |
|------|-------|------------|
| **Starter** | ৳499 / $5 mo | 1 device · BD MFS · unlimited links/invoices · REST + webhooks · **0% fee** |
| **Pro** | ৳999 / $10 mo | 5 devices · MFS + crypto · branding · Telegram/Discord · priority webhook retries |
| **Enterprise / Lifetime** | ৳9,999 / $99 **one-time** | Unlimited devices/stores · full suite · dedicated rate limits · 24/7 support |

Yearly billing is −20% on monthly tiers. Signup: `/register?plan=starter|pro|enterprise|lifetime`.

---

## Quick start (local)

### Frontend

```bash
cp .env.example .env.local
# NEXT_PUBLIC_DATA_SOURCE=live
# NEXT_PUBLIC_APP_URL=http://localhost:3000
# GRESSPAY_PHP_URL=http://127.0.0.1:8080   # or leave empty for same-origin proxy in Docker

npm install
npm run dev
```

### Backend

```bash
cd backend
cp .env.example .env
# JWT_SECRET, APP_URL, DB_* (sqlite is fine for unit tests)

php -S 0.0.0.0:8080 -t public
# Health: GET http://127.0.0.1:8080/api/v1/health
```

### Android companion

```bash
cd GressPay-App-Project
# JDK 17+ and Android SDK
./gradlew :app:testDebugUnitTest --tests com.gresspay.companion.sms.PaymentSmsParserTest
./gradlew :app:assembleDebug
cp app/build/outputs/apk/debug/app-debug.apk ../public/download/gresspay-companion.apk
```

Pair with your brand website `gp_live_` API key (Dashboard → Brands) → opt-in → enable matching.  
`READ_SMS` is requested only when you tap **Scan Inbox (24h)** in the Companion app.

---

## Environment (important)

| Variable | Where | Purpose |
|----------|--------|---------|
| `NEXT_PUBLIC_DATA_SOURCE=live` | Next | Real API (anything else → demo banner / mocks) |
| `NEXT_PUBLIC_APP_URL` | Next | Public site origin |
| `GRESSPAY_PHP_URL` | Next (server) | Upstream PHP for `/api/v1` proxy |
| `JWT_SECRET` | PHP | Session / auth signing |
| `APP_URL` / `PUBLIC_APP_URL` | PHP | Absolute pay URLs & callbacks |
| `DB_*` | PHP | MySQL in production |
| `CORS_ORIGINS` | PHP | Allowed browser origins |

**Your wallets, Binance / Bybit secrets, webhook secrets:** configure in the dashboard only. They are encrypted at rest — do not put them in `.env` or the README.

---

## Verification

CI: [`.github/workflows/verify.yml`](.github/workflows/verify.yml) — Next.js build, PHP tests, Android unit tests + APK artifact.

```bash
# PHP (expect all green)
php backend/tests/run.php

# Next.js
npm run build

# Android
./gradlew -p GressPay-App-Project :app:testDebugUnitTest \
  --tests com.gresspay.companion.sms.PaymentSmsParserTest
./gradlew -p GressPay-App-Project :app:assembleDebug
```

---

## Deploy (Coolify)

Self-hosted VPS via Coolify + persistent MySQL/MariaDB.

1. Point DNS at the VPS.  
2. Follow [`COOLIFY_DEPLOYMENT.md`](COOLIFY_DEPLOYMENT.md) and [`DEPLOYMENT_CHECKLIST.md`](DEPLOYMENT_CHECKLIST.md).  
3. Set live env (`NEXT_PUBLIC_DATA_SOURCE=live`, `APP_URL`, DB, `JWT_SECRET`).  
4. Deploy from **`main`** — Coolify watches this branch.  
5. Confirm `GET /api/v1/health`, register an account, pair a companion device, run a test checkout.

Do **not** claim live Binance/Tron E2E without that account’s real credentials configured in Methods.

---

## Product principles (invariants)

1. **Self-hosted SaaS** — your VPS, your database; not a laptop daemon.  
2. **Multi-tenant isolation** — every account stays inside their `brand_id`.  
3. **Payment integrity** — completed only after SMS match, provider confirm, or on-chain proof.  
4. **0% gateway fee** — funds settle to the wallets you own.  
5. **English UI** — dashboard and marketing copy are English; Bangladeshi rails are first-class.

---

## Related docs

- Backend overview: [`backend/README.md`](backend/README.md)  
- API notes: [`backend/GressPay-API.md`](backend/GressPay-API.md)  
- Rails / security: [`backend/docs/PHASE1_RAILS.md`](backend/docs/PHASE1_RAILS.md)  
- Companion app: [`GressPay-App-Project/README.md`](GressPay-App-Project/README.md)  
- Coolify: [`COOLIFY_DEPLOYMENT.md`](COOLIFY_DEPLOYMENT.md)  

---

## License / ownership

Private product repository for GressPay (EXT SHEFAT). All rights reserved unless otherwise stated.
