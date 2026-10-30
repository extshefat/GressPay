# GressPay Merchant API

Native GressPay JSON API. Base path: `/api/v1` · `Content-Type: application/json`  
Errors: `{ "error": { "code": "...", "message": "..." } }`

See also [`docs/PHASE1_RAILS.md`](docs/PHASE1_RAILS.md) for ops/credentials.

---

## Authentication & scopes

| Method | How |
|--------|-----|
| API key | `Authorization: Bearer gp_live_…` / `gp_test_…` or `X-GressPay-Key` |
| Dashboard JWT | `Authorization: Bearer <jwt>` + optional `X-GressPay-Mode: live\|test` |

**Scopes** (enforced): `create_payment`, `verify_payment`, `read_transactions`, `manage_links`, `manage_invoices`, `manage_methods`, `manage_devices`, `manage_provider`.

- Live key / mode → live ledger only  
- Test key / mode → test ledger; **SMS rails** may simulate COMPLETED on format-valid TxID — never mixed into live  
- Public checkout **cannot** choose ledger mode  

---

## Fixed-price integrity

`POST /api/v1/checkout/{linkOrInvoiceId}/init` uses the **stored** payment-link / invoice amount & currency.  
Buyer-supplied overrides → `AMOUNT_LOCKED`. Variable amounts only via authenticated `POST /checkout/create`.

Webhook URLs on public init are ignored; only merchant settings / link create-time URLs are used (HTTPS + SSRF checks).

---

## Checkout states

| DB status | API status | Meaning |
|-----------|------------|---------|
| initiated | PENDING | Session opened |
| pending | PENDING | TxID submitted / provider order open — **not paid** |
| completed | COMPLETED | Evidence verified |
| expired / failed / refunded | matching | Terminal |

**Evidence types:** `matched` (SMS), `simulated` (test ledger only), `provider_confirmed` (Binance), `on_chain` (USDT), `merchant_confirmed` (audited manual).

---

## Bangladesh SMS companion

| Route | Auth | Notes |
|-------|------|-------|
| `POST /companion/register` | Merchant + `manage_devices` | Returns `deviceId` + token **once** |
| `GET /companion/devices` | Merchant + `manage_devices` | List; no tokens |
| `POST /companion/devices/{id}/revoke` | Merchant | Blocks further SMS uploads |
| `POST /companion/devices/{id}/rotate` | Merchant | New token once |
| `POST /companion/sms` | Device token + **`X-GressPay-Brand`** | Idempotent; stores amount/TxID/rail/device only — **no SMS body** |

Live completion requires matching SMS (brand, rail, TxID, amount±tolerance, age). TxID alone → stays PENDING.

Android app: `GressPay-App/` (`com.gresspay.companion`).

---

## Binance Pay (merchant API — not Spot)

| Route | Notes |
|-------|--------|
| `PUT/GET /merchant/binance-pay` | Write-only secrets; status never returns secrets |
| `POST /checkout/{sessionId}/binance/create` | Server creates order; idempotent |
| `POST /checkout/{sessionId}/binance/reconcile` | **Merchant auth** (`verify_payment`) + brand ownership; query Binance then complete if PAID+exact amount/currency. Not public. |
| `POST /binance-pay/callback` | Verify signature → always query order before COMPLETED |

Live-ready only when: `GRESSPAY_CRYPTO_ALLOWED=1`, merchant `cryptoEnabled`, credentials present.

---

## USDT TRC-20

`POST /checkout/{sessionId}/verify` with `method=usdt_trc20` and tx hash → server Tron verify (contract, recipient, amount, confirmations). Format-valid hash alone does **not** complete live payments.

---

## Manual confirm

`POST /transactions/{sessionId}/confirm` · Scope `verify_payment`  
Body: `{ "reason": "…" }` (min 8 chars). Audited in metadata. **Blocked** for `binance_pay` / `usdt_trc20`.

---

## Webhooks

Signed HMAC-SHA256 of the raw body (`X-GressPay-Signature`), stable `eventId`, HTTPS-only destinations, private IP blocked after DNS. `GpWebhook::dispatch()` retries failed HTTP deliveries in-process up to `WEBHOOK_MAX_RETRIES` (default 5) with `WEBHOOK_TIMEOUT_SECONDS` per attempt (default 8). Each attempt is logged in `gp_webhook_deliveries` with an incrementing `attempt` counter.

---

## Environment (production fail-closed)

Required when `APP_ENV=production`: `JWT_SECRET`, `APP_ENCRYPTION_KEY`, MySQL `DB_PASS` (≥32 chars recommended).  
**Platform env:** `GRESSPAY_CRYPTO_ALLOWED`, `BINANCE_PAY_API_BASE`, `TRON_API_BASE`, `TRON_API_KEY`, `USDT_TRC20_CONTRACT`, `USDT_CONFIRMATIONS`, optional Cloudflare `R2_*` (API only).  
**Merchant (dashboard/DB):** gateway instances in `gp_gateways` (destinations + QR metadata); Binance Pay Merchant API key, secret, and certificate serial sealed per brand — never in `.env`, never returned on GET. These are not Spot trading keys. QR **bytes** in private R2 only.

## Binance Pay vs USDT TRC-20

Binance Pay create uses `POST /binancepay/openapi/v2/order` and stores `prepayId` / `checkoutUrl`. Reconciliation reads Query Order `data.totalFee` ([query order](https://developers.binance.com/docs/binance-pay/api-order-query)). `orderAmount` is accepted only when `totalFee` is absent or both amounts match. A missing or conflicting amount does not mark the session paid. Currency, `merchantTradeNo`, and status `PAID` are still required.

Outbound requests are HMAC-SHA512 over `timestamp\nnonce\nbody\n` ([common rules](https://developers.binance.com/docs/binance-pay/api-common)). Official webhook examples verify RSA-SHA256 with Binance's certificate ([example](https://github.com/binance/binance-pay-signature-examples/blob/master/python/webhook.py)). This build still checks the merchant HMAC on callbacks, so an RSA callback is rejected. The callback body is never treated as proof; a successful order query is required. Create still sends `goodsDetails` on the v2 path. The current v2 document shows a `goods` object ([create order v2](https://developers.binance.com/docs/binance-pay/api-order-create-v2)), and the public query path is `/binancepay/openapi/order/query` rather than `/v2/order/query`. Those request shapes are unchanged until a sandbox call is allowed.

USDT TRC-20 is a TronGrid transfer check: contract, recipient, exact amount, and `USDT_CONFIRMATIONS`. A pasted hash or screenshot does not complete the live ledger. A payment into a Binance deposit address is not a Binance Pay order.

Admin routes exist under `/api/v1/admin` and require `ADMIN_EMAIL` or `ADMIN_EMAILS` on the server. An empty allowlist fails closed. There is no hardcoded administrator. Plan and credit rows are admin records. Credits are not decremented when a checkout or API call runs.

## Gateways (multi-instance) + QR upload

Scope: `manage_methods`. Brand-scoped. Max ~40 gateways/brand.

| Method | Path | Notes |
|--------|------|-------|
| GET | `/gateways` | List + `r2Configured` |
| POST | `/gateways` | Create `{ methodCode, displayName, account, … }` |
| GET/PUT | `/gateways/{id}` | Get/update |
| POST | `/gateways/{id}/enable` / `disable` | Toggle |
| PUT | `/gateways/reorder` | `{ order: [gatewayId…] }` |
| DELETE | `/gateways/{id}` | Delete + best-effort R2 object delete |
| POST | `/gateways/{id}/qr/upload-intent` | `{ contentType, byteSize }` → short-lived PUT URL + `objectKey` |
| POST | `/gateways/{id}/qr/complete` | `{ objectKey }` → HEAD verify + metadata |
| DELETE | `/gateways/{id}/qr` | Clear QR |
| GET | `/gateways/{id}/qr/preview` | Short-lived GET URL for merchant |

Allowed MIME: `image/png`, `image/jpeg`, `image/webp` (max `R2_MAX_UPLOAD_BYTES`, default 5MB).  
Checkout `availableMethods` may include `gatewayId`, `qrImageUrl` (signed GET). Buyer verify may send `gatewayId`. **QR scan ≠ paid.**

### Upload example (Node)

```js
const intent = await fetch(`${API}/api/v1/gateways/${id}/qr/upload-intent`, {
  method: "POST",
  headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
  body: JSON.stringify({ contentType: file.type, byteSize: file.size }),
}).then((r) => r.json());
await fetch(intent.uploadUrl, { method: "PUT", headers: intent.requiredHeaders, body: file });
await fetch(`${API}/api/v1/gateways/${id}/qr/complete`, {
  method: "POST",
  headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
  body: JSON.stringify({ objectKey: intent.objectKey }),
});
```

Similar flow for PHP/Python: authenticated intent → HTTP PUT to `uploadUrl` → authenticated complete.  
Frontend production builds require `NEXT_PUBLIC_DATA_SOURCE=live`.
