# GressPay Web

Next.js merchant dashboard + hosted checkout, with PHP API under [`backend/`](backend/).

## First-release rails

| Rail | Verification |
|------|----------------|
| bKash / Nagad | Merchant personal wallet + Android SMS companion match |
| Binance Pay | Official Binance Pay Merchant API (server-side) |
| USDT TRC-20 | On-chain verification via Tron API |

India, Pakistan, Nepal, Rocket/Upay/Cellfin, Bybit are **out of scope** for this release.

## Frontend env

```bash
NEXT_PUBLIC_DATA_SOURCE=live   # required for real API; anything else shows DEMO banner + mock data
NEXT_PUBLIC_API_URL=           # optional; empty uses same-origin /api/v1 proxy
```

## Backend

See [`backend/docs/PHASE1_RAILS.md`](backend/docs/PHASE1_RAILS.md) and [`backend/.env.example`](backend/.env.example).

```bash
cd backend && php tests/run.php
```

## Verification & deploy

- CI: [`.github/workflows/verify.yml`](../.github/workflows/verify.yml) (no local PHP/JDK required).
- Coolify: [`../COOLIFY_DEPLOYMENT.md`](../COOLIFY_DEPLOYMENT.md) + [`../DEPLOYMENT_CHECKLIST.md`](../DEPLOYMENT_CHECKLIST.md).
- Merchant wallets / Binance secrets: **dashboard only**, encrypted at rest — not `.env`.

Do not claim live Binance/Tron E2E without merchant credentials.

## Android companion

See [`../GressPay-App/`](../GressPay-App/) — RECEIVE_SMS only, encrypted prefs, Gradle wrapper + bKash/Nagad parser fixtures.
