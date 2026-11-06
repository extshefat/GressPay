# Hosted checkout: details before waiting

## Reference and resulting flow

The owner supplied a private screen recording. The relevant sequence is visible
at approximately 23s (category / rail), 28–38s (payer number), and 43–53s
(receiving number, exact amount, instructions, expiry timer and verification).
The recording and its real account details are not included in this repository.
GressPay keeps its own design tokens and original payment rail logos.

1. Choose Mobile payment, Crypto, Indian payment, or Bank transfer.
2. Choose one of the **actual methods returned for this merchant's session**.
3. For Bangladesh MFS, enter your paying number. Existing brands that do not
   require payer matching retain optional entry; SMS-auto requires it.
4. See the merchant's receiving account/address, exact quoted amount, numbered
   instructions and the server-supplied payment-window countdown.
5. After transferring, choose **I have paid**. TrxID mode then shows reference
   entry. SMS-auto sends the payer context for matching only when enabled by the
   server. Binance opens its provider checkout; crypto uses its own instructions.
6. Keep receiving details visible during verification. A PENDING response is
   never a successful payment. Only server confirmation opens the receipt.

The countdown follows `expiresAt`; no arbitrary waiting delay or frontend timer
can approve a payment. A failed final-status request preserves a retryable check
instead of claiming a live payment expired. Already submitted payments resume
with their receiving details and reference. Do not collect provider PINs/OTPs.

The India and bank categories remain visible but unavailable unless the server
supplies a configured method. This work does not add unsupported integrations or
invent bank accounts. Further subtype selection is intentionally deferred as
requested; the existing account type stays visible as an instruction label.

## Root cause

`GpPresenters::checkoutSession` previously set `awaitingEvidence` for every
`pending` row, including fresh invoices without any buyer submission. The client
then replaced its receiving details with a waiting screen. The flag now requires
an actual selected method plus a stored reference, provider trade, or server
submission state. Browser initialization also guards against the old broad flag.

## Compatibility and implementation

- The create/init/verify/status/cancel API routes and verify request keys stay
  unchanged. No migration or payment-completion rule was changed.
- Receiving account, amount, fees and expiry originate from the server. The UI
  does not calculate a new payable amount. Display/copy preserves the quote's
  precision (up to eight decimals) using the shared money formatter.
- Status responses currently return the invoice amount, not a new settled-amount
  field. Resumed receipts use `settledAmount` when supplied; otherwise the display
  is labeled **Checkout amount**, rather than inventing a settlement value.
- `HostedCheckoutModal` is composition only. Selection/transfer/reference panels
  are small components; request handling is in `hooks/useCheckout.ts`.
- POST submission uses a synchronous lock; polling requests are serialized with
  backoff after failures. Offline feedback retains the visible payment details.
- Existing `session`/`demoMode` props remain. `previewSeed` applies only in the
  explicitly labeled preview; preview cannot call the payment APIs or simulate
  live settlement. Preview covers all normal and terminal states.
- All merchant payment destinations remain scoped by the original server session.

## Verification and visual review

`npm run check:checkout` covers initial/resumed states, category classification,
server-authoritative outcomes, timer formatting and payer/reference validation.
PHP regression assertions in `backend/tests/run.php` cover fresh/preselected
pending invoices, real TrxID submissions, SMS-auto, provider orders and receipts.
Run PHP only in CI/VPS, per AGENTS.md.

Browser regression: start the web build on localhost and an isolated Chrome with
`--remote-debugging-port=9222`, then run:

```sh
node scripts/check-checkout-browser.mjs
```

The script refuses non-local server URLs and intercepts payment requests with
isolated fixtures. It checks ordering, copy acknowledgement, exact request body,
double-submit protection, resume, SMS-auto, crypto hash errors, offline recovery,
server expiry, cancel focus/ESC, and zero API calls from the visual preview.
CI runs it against the production build and uploads `checkout-flow-review`.

Screenshots cover light/dark at 320, 360, 390, 768, 1024, 1280, 1536 and 1920px,
plus choosing, payer, payment, verify, submitted, SMS waiting, success, expired,
final-status check, cancelled, failed, refunded and empty states. Review checks
that receiving details persist, real logos remain legible, long references wrap,
Bangla merchant names render, and there is no horizontal document overflow.

Remaining limits: no real payment was sent, no on-device Android/4G test or
screen-reader certification was performed, and the PHP regressions run in CI.
The local pre-existing dependencies contain Next 15.1.0; CI installs the lockfile's
15.5.29. The existing local dependencies also lack the ESLint binary, so lint
could not run locally; CI runs it after `npm ci`. No dependencies were added or
installed for this work.
