# Minimal PSP / website integration (GressPay)

Copy-paste-friendly sample for a **payment service provider** or any HTTPS backend that redirects buyers to GressPay hosted checkout and fulfills on **server-side verify** or **signed webhooks**.

Production API base (no sandbox in this sample):

```text
https://gresspay.extxcheats.com/api/v1
```

## 1. Create your account

Sign up on GressPay (free tier is fine):

**https://gresspay.extxcheats.com/register**

Complete email verification if prompted.

## 2. Get API keys (dashboard)

| Key | Where | Used for |
|-----|--------|----------|
| **Brand website API key** (`gp_live_…`) | Dashboard → **Brands** → your website → API keys | Server `Authorization: Bearer` on `POST /payment/create` and verify |
| **Device API key** (`gp_live_…` device scope) | Dashboard → **Devices** → register / rotate | Android **GressPay Companion** pairing only (not used in these PHP files) |
| **Webhook signing secret** (`gpwh_…`) | Dashboard → **Settings** / brand webhook secret | HMAC verify on incoming webhooks |

Never put `gp_live_` keys in browser JavaScript or mobile apps you do not control.

## 3. Create a payment

Set environment variables (or edit the scripts):

```bash
export GRESSPAY_API_KEY="gp_live_your_brand_website_key"
export GRESSPAY_WEBHOOK_SECRET="gpwh_your_webhook_secret"
```

Run the checkout starter (starts PHP built-in server on port 8080):

```bash
cd sdk/examples/psp-minimal
php -S 0.0.0.0:8080
```

Open `http://127.0.0.1:8080/create-payment.php` — it creates a session and redirects to GressPay checkout.

Files:

- `create-payment.php` — `POST /payment/create`, redirect to `payment_url`
- `verify-return.php` — optional return URL handler calling `POST /payment/verify`
- `webhook.php` — verify `X-GressPay-Signature`, fulfill when `status` is `COMPLETED`
- `create-payment.mjs` — same create flow in Node 18+

## 4. Handle webhook callback

Point `webhook_url` at your public HTTPS endpoint (e.g. `https://shop.example/hooks/gresspay.php` → copy logic from `webhook.php`).

Verification steps (must match raw body bytes):

1. Read **raw** POST body (do not re-encode JSON).
2. `expected = hash_hmac('sha256', rawBody, GRESSPAY_WEBHOOK_SECRET)` (hex).
3. Compare to header `X-GressPay-Signature` with `hash_equals`.
4. Parse JSON; fulfill only if `status === "COMPLETED"`.
5. Respond HTTP 200 quickly.

Also call `POST /payment/verify` with `sessionId` before shipping high-value orders (defense in depth).

## Download zip

Pre-packaged copy (same files): **https://gresspay.extxcheats.com/download/gresspay-psp-example.zip**

Source in this repo: `sdk/examples/psp-minimal/`.
