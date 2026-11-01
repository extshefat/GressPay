# GressPay: payment automation master plan

**Reviewed:** 2026-11-01 · **Scope:** repository architecture, checkout/companion code, Android source, deployment docs, and public production health endpoint. Production database contents, actual SMS samples, Coolify configuration, and release APK signing were not inspected in this pass. The supplied VPS scripts store connection settings, but no trusted SSH host key was available locally, so direct SSH inspection was not performed.

## 1. Product definition

GressPay should be a **self-hosted, non-custodial payment verification platform**. A merchant configures their own receiving wallet; a customer pays that wallet; GressPay verifies evidence and informs the merchant's site. GressPay does not receive or settle the funds. This distinction should appear consistently in marketing, onboarding, checkout, API docs, and terms. A personal-wallet SMS flow is distinct from an official bKash/Nagad merchant gateway integration.

The reference product appears to be **ZiniPay** (the requested “জেনিপে”). Its public documentation describes hosted invoice creation, backend status verification, Android companion automation, plugins, and webhooks. Borrow the workflow ideas, not its exact wording or UI. Sources: [ZiniPay API docs](https://zinipay.com/docs), [ZiniPay FAQ](https://zinipay.com/faq), [ZiniPay Android guide](https://zinipay.com/blog/apps-plugins/zinipay-android-app-v3-payment-automation). UddoktaPay's device guide gives a useful second example of SMS capture, TxID matching, and pending fallback: [Devices](https://docs.uddoktapay.com/devices).

## 2. Existing foundation

| Layer | Already present | Work still needed |
| --- | --- | --- |
| Web | Next.js marketing, merchant dashboard, hosted checkout, payment links, invoices, methods, devices, events | Clear setup journey, failure diagnostics, checkout status guidance, accessibility/mobile review |
| API | PHP checkout, brand-scoped methods/gateways, device tokens, SMS evidence, webhook worker, Binance Pay and TRON verifiers | Evidence immutability and uniqueness, ambiguous-match safety, expiry rules, PostgreSQL query audit, observability |
| Android | Kotlin SMS receiver, parser, WorkManager retry, inbox backfill, heartbeat, device pairing | Verified sender samples, production signing, on-device end-to-end tests, narrower permissions/distribution review |
| Integrations | PHP SDK, WooCommerce plugin, examples | Contract tests, replay-safe webhook examples, versioned API and sandbox documentation |
| Hosting | Coolify/Docker configs, public site health responds 200 | Align PostgreSQL deployment reality with MySQL-oriented runbook; confirm backups, workers and alerting |

The public `https://gresspay.extxcheats.com/api/v1/health` endpoint responded `200` with `database.ok=true` and `driver=pgsql` on this review. That confirms only the public app/API/database health check, not end-to-end payments or VPS configuration.

## 3. Required payment flow

1. Merchant creates a brand, adds a receiving gateway (bKash/Nagad number and account type), pairs a dedicated Android device, and binds that device to the correct gateway. Device health and last SMS sync must be visible.
2. Merchant server creates a unique checkout session through a server-side API key. Record brand, amount/currency, receiving gateway, return URL, webhook URL, expiry, and merchant order ID. The buyer sees the **actual payable amount** and receiving number.
3. Buyer pays directly to that wallet. For the default reliable mode, buyer submits the TxID. An optional automatic mode may omit TxID only when one pending session can be identified uniquely; otherwise ask for TxID or manual review.
4. The paired Android app accepts only recognized incoming credit messages from explicitly approved sender addresses. It parses rail, amount and TxID locally, sends only required fields over HTTPS with a device credential and idempotency key, and retries safely while offline. Never upload OTP, PIN, full inbox, or arbitrary message bodies.
5. API stores immutable SMS evidence and matches **brand + rail + wallet/gateway + TxID + amount + time window + pending session**. One evidence record can settle one session. Conflicts or ambiguity stay pending and enter a review queue. A buyer click, screenshot, or self-reported TxID alone can never complete a live payment.
6. Database transaction atomically claims evidence, marks one session completed, records audit evidence and queues one signed webhook. Merchant checks status server-to-server before delivery. Webhook retries are idempotent and visible in the dashboard.
7. Official merchant API rails, Binance Pay, and USDT are separate verifier implementations. Official bKash merchant checkout should use approved provider APIs/credentials when available; do not present SMS automation as official provider verification. See [bKash merchant account](https://www.bkash.com/index.php/en/business/merchant).

## 4. Priority findings from source review

### P0 — payment integrity

- **Untrusted SMS sender fallback:** `PaymentSmsParser` accepted an unknown sender if the body contained a rail name, and substring matching accepted names such as `fakebkash`. This pass changed the parser to exact sender allowlists. The numeric and alphanumeric sender list still needs confirmation using real merchant receipt samples. An SMS sender label can itself be spoofed; this system provides operational evidence, not cryptographic proof from bKash/Nagad.
- **Mutable approved evidence:** repeated `/companion/sms` calls could rewrite amount, rail, device, and wallet for an existing approved TxID. This pass rejects conflicting duplicates and keeps the stored evidence unchanged while allowing an identical retry to reconcile a later checkout.
- **Automatic amount-only matching:** `trySmsAutoSettle` uses the newest matching SMS; the upload path checks for multiple candidate sessions, but the status-polling path can choose a session without the same ambiguity check. Gate `sms_auto` behind an explicit one-candidate check, or use TxID mode as the production default until that is fixed.
- **Evidence race/uniqueness:** `gp_sms_data` has an index on `(brand_id,trx_id)` but no unique constraint. Add normalized TxID uniqueness per rail/brand with a migration, then handle concurrent uploads and replays in a transaction. Define how two brands may use the same provider TxID without cross-tenant leakage.
- **Time correlation:** SMS age is capped at 48 hours from ingestion, but matching does not require evidence to relate to the checkout's creation/payment window. Add a bounded before/after window using the original SMS timestamp and session timestamps; never let old unused SMS settle a new order.

### P1 — reliability and deployment

- Production health reports **PostgreSQL** while `COOLIFY_DEPLOYMENT.md` describes MySQL. This pass replaced the companion device revoke query's MySQL-only `UPDATE ... INNER JOIN` syntax; audit the remaining SQL branches against PostgreSQL and update the runbook.
- Confirm the webhook worker runs continuously on the VPS and inspect retry/dead-letter handling, worker health, backups and restore drills. A web `200` response does not prove the worker runs.
- Publish a release-signed APK and compare its SHA-256 with dashboard/download metadata. The existing APK security review records a historically debug-signed published binary; verify the **current** binary before release claims.
- Expose device last seen, SMS last accepted/rejected, upload latency, parser version, and clear reasons for pending/rejected payments. Alert on offline devices, unusual duplicate attempts and webhook failures.

### P2 — product completeness

- Guided onboarding: brand → gateway → device → test SMS → API key → test checkout → webhook test → live enablement. Do not allow `sms_auto` until a gateway and healthy bound device are present.
- Reconciliation screen with filtered unmatched/conflicting SMS, pending sessions, immutable audit trail, and role-scoped manual approval with a required reason. Manual approval must be visibly distinct from automatic verification.
- Merchant developer experience: versioned API schema, signed webhook verification examples, PHP/WooCommerce integration tests, sandbox and a live-readiness checklist.
- Add notification-listener support only after testing its reliability and privacy implications; Android exposes `NotificationListenerService`, but notification text is another app-controlled signal and may be redacted. It must not automatically carry the same confidence as provider-verified API evidence. [Android API reference](https://developer.android.com/reference/android/service/notification/NotificationListenerService).

## 5. Android privacy and distribution decisions

The current APK declares `RECEIVE_SMS` and `READ_SMS`. Google Play restricts SMS permissions to default SMS handlers or approved exceptions. Choose distribution deliberately: a privately distributed companion on dedicated merchant phones needs clear disclosure, consent, signing and update verification; a Play listing needs a policy review and may require a different architecture. Do not promise Play approval. [Google Play SMS policy](https://support.google.com/googleplay/android-developer/answer/10208820), [Android default-handler guidance](https://developer.android.com/guide/topics/permissions/default-handlers).

Keep the sender allowlist explicit and versioned. Gather redacted *real inbound credit* examples from bKash and Nagad across account types/SIMs. Add those formats as parser fixtures; reject OTP, outgoing transfer, refund, promotional and ambiguous messages. Never expand the allowlist merely because a customer says an SMS was missed.

## 6. Implementation sequence and gates

| Phase | Deliverable | Gate to move on |
| --- | --- | --- |
| 0 — current pass | Strict SMS sender parsing, immutable duplicate evidence, PostgreSQL-compatible device revoke, master plan | Source diff reviewed; Android/PHP test execution still pending |
| 1 — safety | Unique evidence migration, `sms_auto` ambiguity guard, time correlation, PostgreSQL SQL fixes | Concurrent duplicate/late SMS/cross-brand tests pass on VPS staging; no live auto-settlement from ambiguous evidence |
| 2 — companion | Real SMS fixtures, bounded inbox replay, device-to-wallet validation, signed release APK | Two physical phones and bKash/Nagad credit/debit/OTP scenarios pass; checksum matches released APK |
| 3 — operations | Worker and database monitoring, backup restore, dispute/reconciliation queue | Offline and retry drill passes; merchant can explain every payment decision |
| 4 — product | Onboarding, checkout UX, sandbox/API docs, WooCommerce contract tests | New merchant completes setup and test payment unaided; webhook consumer verifies server status |
| 5 — expansion | Official merchant API integrations and other rails only with provider access | Provider contract/sandbox approval, separate verifier, failure and refund tests |

## 7. Verification scenarios

- Valid bKash/Nagad incoming credit settles exactly one correct brand/wallet/amount/session.
- Wrong sender, unknown sender, body-only rail name, OTP, debit, refund, wrong amount, wrong wallet and wrong brand remain unverified.
- SMS-before-TxID, TxID-before-SMS, network retry, app restart and device offline all reach the correct pending/completed state.
- Same TxID with changed amount/rail/wallet is rejected; simultaneous duplicate uploads cannot create two claims.
- Two pending amount-only sessions never auto-settle against one SMS; expired session never becomes paid.
- Webhook may be delivered more than once but merchant order is fulfilled once after server-side status check.
- PostgreSQL staging migration and restore drill pass before live deployment.

## 8. Release and access boundary

No production deployment or GitHub push is part of this review. The local repo is currently at `C:\Users\XHEFAT\Desktop\My Own Paymnet GateWay` (the `GressPay- Web` subdirectory mentioned in `AGENTS.md` does not exist here). Do not run PHP, Gradle, Docker, database servers, or installers on this Windows laptop. Use the existing CI or the remote VPS/staging for backend and Android build verification. Before changing live schema or payment matching behavior, take a verified backup and rehearse the migration on staging.
