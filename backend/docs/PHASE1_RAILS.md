# GressPay Phase-1 rails — ops notes

## Release rails

Catalog source of truth: `backend/src/lib/Catalog.php` (`releaseScope` + super-admin `gp_platform_gateways.is_enabled`).

| Code | Verification | Live when |
|------|----------------|-----------|
| `bkash` | Android SMS companion match | Gateway instance(s) + active companion uploading SMS |
| `nagad` | Android SMS companion match | Same |
| `rocket` | Android SMS companion match | Same |
| `upay` | Android SMS companion match | Same |
| `cellfin` | Android SMS companion match | Same |
| `binance_pay` | Binance Pay Merchant API (create + signed callback + order query) | Platform `GRESSPAY_CRYPTO_ALLOWED=1`, merchant `crypto_enabled`, credentials sealed on brand; catalog `releaseScope: false` until operator enables via admin platform gateways |
| `usdt_trc20` | TronGrid on-chain verify | Same crypto gate + merchant receiving address + (recommended) `TRON_API_KEY` |
| `bybit_pay` | Manual TxID / UID (no automated provider API in this build) | Merchant gateway configured; optional platform toggle |

**Not in catalog (plugins only):** India / Pakistan / Nepal rails (`esewa`, `phonepe`, `jazzcash`, etc.) — UI may show “Coming Soon”; not first-release checkout.

**Companion SMS uploads** authenticate with the **`gpdev_` device API key** (Bearer). Brand is inferred from the device row created in the dashboard; `X-GressPay-Brand` is optional when it matches `brd_*`.

## Secrets (production)

Set strong values (no placeholders). API refuses to boot when `APP_ENV=production` and any of these are weak/missing:

- `JWT_SECRET` (≥32)
- `APP_ENCRYPTION_KEY` (≥32)
- `DB_PASS` (MySQL)

## Binance Pay

- Do **not** use Spot API keys.
- Configure **only** via dashboard / `PUT /api/v1/merchant/binance-pay` `{ apiKey, secret, certificateSn }` — sealed in `gp_brands.binance_pay_json`. **Never** put merchant key/secret/SN in `.env`.
- Platform env may set `BINANCE_PAY_API_BASE` only.
- Checkout (buyer): `POST /api/v1/checkout/{sessionId}/binance/create` (rate-limited; no secrets exposed).
- Merchant reconcile: `POST /api/v1/checkout/{sessionId}/binance/reconcile` — requires actor + `verify_payment` + brand ownership; not anonymous.
- Callback: `POST /api/v1/binance-pay/callback` — signature + nonce replay protection, then order query before COMPLETED. Empty provider amount/currency → `PROVIDER_MISMATCH`.

## USDT TRC-20

- Merchant sets **their** receiving address in method `options.account` (dashboard). No platform default wallet.
- Platform env: `USDT_TRC20_CONTRACT`, `USDT_CONFIRMATIONS`, optional `TRON_API_KEY` (TronGrid access — not a wallet).
- Buyer submits tx hash; backend queries TronGrid; completes only when contract, recipient (Base58), micro-amount, and confirmations match.

## Webhooks

- HTTPS only; private/link-local IPs blocked after DNS.
- Destinations from merchant settings / payment-link create only (not public checkout body).
- Signed with `X-GressPay-Signature` over exact raw JSON; stable `eventId`.
- `GpWebhook::dispatch()` retries failed deliveries in-process up to `WEBHOOK_MAX_RETRIES` (default 5) with `WEBHOOK_TIMEOUT_SECONDS` per attempt (default 8). Each attempt is logged in `gp_webhook_deliveries`.
