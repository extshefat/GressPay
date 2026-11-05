# Phase 2 — Manual QA checklist (live site)

Run on production/staging after deploy. Default display zone: **Asia/Dhaka**. Mark Pass / Fail / N/A. Capture screenshots for Fail.

Environment: ________________  Build/commit: ________________  Tester: ________________  Date: ________________

## 0. Preconditions

- [ ] Coolify web + API green for current `main`
- [ ] Test merchant email verified (or Google)
- [ ] At least one brand; companion APK optional for SMS rails
- [ ] Browser: Chrome desktop + phone ~320–390px width
- [ ] Dark + light theme once each for dashboard shell

## 1. Auth

| # | Case | Pass? |
|---|------|-------|
| 1.1 | Register with password &lt; 10 chars → validation error | |
| 1.2 | Register valid → lands dashboard; banner/flag shows email unverified | |
| 1.3 | Verify email link → `emailVerified`; live key mint allowed | |
| 1.4 | Login wrong password 5× → rate limited; message generic | |
| 1.5 | Login remember-me → still session after browser restart (~24h+) | |
| 1.6 | Google OAuth happy path → dashboard | |
| 1.7 | Google deny/cancel → friendly error, no raw Google dump | |
| 1.8 | Logout → login page; second account does **not** inherit previous brand | |
| 1.9 | Expire/revoke session (or bump `token_version`) → clean redirect to login, no loop | |
| 1.10 | After 401 mid-page, intended path preserved on re-login (`?next=` or equivalent) | |
| 1.11 | Accept team invite link while logged out → login/register → land on invited brand | |

## 2. Workspace

| # | Case | Pass? |
|---|------|-------|
| 2.1 | No-brand user sees NoBrandBanner / create CTA | |
| 2.2 | Create brand → JWT/brand context updates; Brands table shows keys | |
| 2.3 | Switch brand → API calls use new brand; no forced logout | |
| 2.4 | Switch brand after Google-linked account (`token_version` &gt; 0) still works | |
| 2.5 | Header Live/Test badge matches request mode; hard to confuse | |
| 2.6 | Hit plan brand limit → create blocked with clear message / banner | |

## 3. Gateways / methods

For each rail you enable: bKash, Nagad, Rocket, Upay, Cellfin, Binance Pay, Bybit Pay, USDT TRC-20, any custom listed in Methods.

| # | Case | Pass? |
|---|------|-------|
| 3.1 | Add wallet with invalid BD mobile → specific error | |
| 3.2 | Add USDT with invalid TRON address → rejected | |
| 3.3 | Binance without keys → not live-ready | |
| 3.4 | Two accounts same rail → both listed; shuffle toggle behaves | |
| 3.5 | Enable/disable gateway → readiness badge updates | |
| 3.6 | QR upload PNG &lt; 2MB → success; &gt; limit → clear error | |
| 3.7 | Fee % / fixed → checkout fee matches FeeEngine expectation | |
| 3.8 | USDT auto vs custom rate → quote uses intended source (no Binance bleed) | |
| 3.9 | MethodReadiness reasons match UI badge | |

## 4. Devices

| # | Case | Pass? |
|---|------|-------|
| 4.1 | Create device → key shown once; copy works | |
| 4.2 | Refresh page → full key not shown again (prefix/sealed only) | |
| 4.3 | Bind to **active** gateway → SMS of that rail accepted | |
| 4.4 | Bind to disabled gateway → blocked or clear error | |
| 4.5 | Online/offline after APK heartbeat | |
| 4.6 | Revoke → APK requests 401 | |
| 4.7 | SMS log lists brand-scoped rows; labels make sense | |
| 4.8 | Unsupported rail from APK → exact readable error | |

## 5. Payment links / store / invoices

| # | Case | Pass? |
|---|------|-------|
| 5.1 | Create link → public `/pay/{id}` opens checkout | |
| 5.2 | Storefront `/store/{id}` shows product | |
| 5.3 | Disable/archive link → public fails gracefully | |
| 5.4 | Expiry / success redirect URLs work | |
| 5.5 | Invoice paid after evidence → status Paid | |

## 6. Hosted checkout (per rail you use)

| # | Case | Pass? |
|---|------|-------|
| 6.1 | Create session → amount/currency/rail correct | |
| 6.2 | Switch rail mid-checkout → destination updates | |
| 6.3 | TrxID submit + matching SMS → completed | |
| 6.4 | sms_auto (if platform flag on) → payer phone + auto match | |
| 6.5 | Wait/poll UI while pending | |
| 6.6 | Expiry → EXPIRED, not stuck “Confirming” | |
| 6.7 | Cancel → canceled copy (not “unsuccessful payment”) | |
| 6.8 | Resume existing `chs_*` URL | |
| 6.9 | Duplicate TrxID → generic cannot-use error | |
| 6.10 | Amount tolerance / exact policy | |
| 6.11 | Success redirect fires | |
| 6.12 | Webhook delivery row appears after complete | |

## 7. Webhooks

| # | Case | Pass? |
|---|------|-------|
| 7.1 | Set HTTPS public URL → save | |
| 7.2 | Private/localhost URL → rejected with readable reason | |
| 7.3 | Rotate secret → new secret shown once | |
| 7.4 | Test send → success or clear failure | |
| 7.5 | Delivery log shows status; blocked shows **why** | |
| 7.6 | Failed delivery retries (worker running) | |

## 8. Transactions

| # | Case | Pass? |
|---|------|-------|
| 8.1 | Filters / search / status pills | |
| 8.2 | Toggle Live/Test → list refreshes | |
| 8.3 | Detail drawer: evidence, fee, **net = amount − fee** | |
| 8.4 | Deep link from overview `?id=` opens correct txn | |
| 8.5 | Manual confirm hidden/disabled for live bKash/Nagad | |
| 8.6 | Export (if present) | |

## 9. API keys & developers

| # | Case | Pass? |
|---|------|-------|
| 9.1 | Brands: issue live key (verified email) reveal once | |
| 9.2 | Revoke / rotate | |
| 9.3 | Test vs live keys isolated | |
| 9.4 | `/developers` snippets: host, paths, headers match live API | |

## 10. Team

| # | Case | Pass? |
|---|------|-------|
| 10.1 | Invite by email → accept | |
| 10.2 | Role permissions match what menus/actions allow | |
| 10.3 | Staff `/me` shows **staff** identity, not owner email | |
| 10.4 | Brand scoping: staff only sees allowed brands | |

## 11. Billing / plans

| # | Case | Pass? |
|---|------|-------|
| 11.1 | Fees page plans match enforced limits | |
| 11.2 | `?plan=` on my-payments highlights (and checkout if enabled) | |
| 11.3 | Trial expiry → quotas drop to trial | |
| 11.4 | PlanUsageBanner accurate at limits | |
| 11.5 | Lifetime / upgrade paths | |

## 12. Platform admin

| # | Case | Pass? |
|---|------|-------|
| 12.1 | Non-admin → 403 on `/admin` APIs | |
| 12.2 | Search merchants; multi-brand merchant appears **once** | |
| 12.3 | Disable merchant → login blocked | |
| 12.4 | Plan / lifetime / role change audited | |
| 12.5 | Health/readiness panels load | |

## 13. Settings & misc pages

| # | Case | Pass? |
|---|------|-------|
| 13.1 | Branding save then General save does **not** revert name | |
| 13.2 | Telegram/Discord: set flags only (no raw Discord URL returned) | |
| 13.3 | Test alert | |
| 13.4 | Notifications prefs persist | |
| 13.5 | Support ticket create | |
| 13.6 | Landing-pages / apps / my-payments / brands load empty+error states | |

## 14. Cross-cutting

| # | Case | Pass? |
|---|------|-------|
| 14.1 | Every visited page: loading → empty/error/success | |
| 14.2 | Submit buttons disable + loading; no double create | |
| 14.3 | Destructive actions confirm | |
| 14.4 | Toasts dismiss; no stuck stack | |
| 14.5 | No console errors / hydration warnings | |
| 14.6 | Dark/light parity on key pages | |
| 14.7 | 320px: no horizontal scroll; controls reachable | |

## 15–16. Contracts / money / time

| # | Case | Pass? |
|---|------|-------|
| 15.1 | Network tab: `/me` includes `emailVerified` | |
| 15.2 | Transaction JSON `netAmount` ≈ amount − fee | |
| 16.1 | Dashboard dates readable in Asia/Dhaka expectation | |
| 16.2 | BDT amounts no float drift on fee display | |

## Sign-off

Blockers open: ________________  
Highs open: ________________  
Ready for production? Yes / No  

## Owner follow-ups

- Refresh lockfile already on `main` after Phase 1; keep `npm ci` green in CI.
- Recommended: Playwright smoke — login, add bKash gateway, complete checkout, webhook test.
- SMTP + `TRUSTED_PROXIES` + R2 required for verify-email / QR / correct client IP.
