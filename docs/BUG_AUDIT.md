# Phase 2 — Bug audit (confirmed in code)

Audit date: 2026-11-05 (Asia/Dhaka). Status column updated as fixes land. Only issues verified by reading UI → `api-client` → PHP → DB → response paths.

| ID | Area | Severity | Steps / code path | Root cause | Fix plan | Status |
|----|------|----------|-------------------|------------|----------|--------|
| WS-01 | Workspace | blocker | Brand switch → `BrandsController::switchBrand` → `GpJwt::encode` without `tv` → next API call `Auth::resolveActor` | JWT defaults `tv=0`; rejects when merchant `token_version > 0` (e.g. after Google link / password wipe) | Use `GpJwt::issueForMerchant($merchant, ['brand'=>…], $ttl)` | fixed |
| MONEY-01 | Money | blocker | `Presenters::transaction` `netAmount` = `amount + fee` | Sign inverted vs `FeeEngine` / UI “amount − fee” | Set `netAmount` from `local_net` or `GpMoney::sub` | fixed |
| AUTH-01 | Auth | high | Logout `api.clearToken()` | Does not clear `gresspay_brand_id` / in-memory brand; next user keeps `X-GressPay-Brand` | Call `setBrandId(null)` (+ reset ledger) in `clearToken` | fixed |
| AUTH-02 | Auth | high | Any 401 except `/me` | Cookie/`sessionActive` survive revoked JWT / other 401s | Clear session on authenticated 401s; redirect login | fixed |
| TEAM-01 | Team | high | Staff `/me` via `AuthController::me` after actor rewrite | Returns **owner** merchant profile (name/email/admin) as staff identity | Load profile from JWT subject / staff merchant id | fixed |
| BILL-01 | Billing | high | `Platform::planLimitsForBrand` vs `PlanLimits::effectivePlanCode` | Device/gateway quotas use raw `plan_id`, ignore expiry; checkout uses effective/trial | Use `effectivePlanCode()` in `planLimitsForBrand` | fixed |
| GW-01 | Gateways | high | `syncMethodFeesFromGateway` → `custom_rate_bdt` on method row; `RatesEngine::customRateBdt` scans all methods | Binance `exchangeRate` can override USDT BDT rate brand-wide | Scope custom rate to USDT only; don’t map Binance FX into `custom_rate_bdt` | fixed |
| DEV-02 | Devices | high | `bindDeviceGateway` allows inactive GW; SMS requires active | Bind to disabled gateway → `DEVICE_RAIL_MISMATCH` on SMS | Reject inactive bind; filter dropdown | fixed |
| TXN-01 | Transactions | high | Header Live/Test → `gresspay-mode`; transactions page mounts once | List never refetches on mode change | Refetch on `gresspay-mode` | fixed |
| TXN-02 | Transactions | high | Overview `?id=` → transactions `find` in loaded 100 | Deep link fails if row outside page / wrong ledger | `GET /transactions/{id}` when `id` present | fixed |
| SET-01 | Settings | high | Branding saves `brandName`; General save still sends stale `businessName` → `putSettings` updates brand `name` | Clobber brand display name across tabs | Omit `businessName` from general save or sync state | fixed |
| MET-01 | Overview | high | `DashboardController::metrics` no `ledger_mode` filter | Live/test revenue blended while UI implies active mode | Filter metrics by actor mode | fixed |
| AUTH-03 | Auth | medium | Session `GET` shape-only JWT | Sets `ok` without PHP verify | Proxy `/me` or verify cookie server-side | fixed |
| AUTH-04 | Auth | low | Google callback page shows `error_description` | Raw third-party text in UI | Map known error codes to fixed copy | fixed |
| WS-02 | Workspace | medium | Invalid `X-GressPay-Brand` → no brand fallback | Actor loses brand context despite owning brands | Ignore bad header; fall back to first brand | fixed |
| WS-03 | Workspace | medium | `PlanUsageBanner` only when brand limit ≤ 1 | Pro/Premium at brand cap get no banner | Show whenever `brands.atLimit` | fixed |
| WS-04 | Workspace | medium | Empty brand header prefers own brands over team | Dual merchant+teammate never enters team workspace by default | Prefer team workspace when membership active | open |
| WS-05 | Workspace | low | Ledger mode badge + `localStorage` before layout force-live | Early requests can send stale `X-GressPay-Mode: test` | Sync reset before first fetch | open |
| TEAM-02 | Team | medium | Same as WS-04 for invitees | Invite sets brand client-side; identity still wrong until header set | Issue JWT with workspace brand after accept | open |
| TEAM-03 | Team | low | `Team::can` bypass for platform admin | Admin teammate skips permission matrix | Enforce matrix when `team_member_id` set | open |
| BILL-02 | Billing | medium | `isAdminMerchant` by role alone | Unverified `role=admin` gets unlimited quotas | Require `email_verified` (+ allowlist) | fixed |
| BILL-03 | Billing | medium | `/my-payments?plan=` only highlights | Never auto-starts checkout | Optional auto `createPlanOrder` with confirm | open |
| ADMIN-01 | Admin | medium | `listMerchants` LEFT JOIN brands | One row per brand duplicates merchants | Aggregate per `merchant_id` | fixed |
| ADMIN-02 | Admin | low | Support reply no `logAudit` | Unlike role/plan/status changes | Audit `support_reply` | fixed |
| GW-02 | Gateways | medium | UI `exchangeRateMode: auto` ignored by PHP | Stale `custom_rate_bdt` remains | Persist mode; clear rate on auto | fixed |
| GW-03 | Gateways | medium | UI 5MB QR vs direct upload 2MB | Client passes, server rejects | Align limits + copy | fixed |
| GW-04 | Gateways | low | Companion badge ≠ `needs_companion` | Shows “connected” for incomplete readiness | Use readiness mapping | open |
| DEV-01 | Devices | medium | Devices all brands; SMS logs active brand only | Confusing multi-brand feed | Scope or label by brand | open |
| DEV-03 | Devices | low | SMS column “Sender Phone” = `number` (wallet) | Mislabel | Rename; show `payer_phone` if API exposes | fixed |
| LNK-01 | Links | medium | Each `/pay/{pl_*}` opens new `chs_*` | Concurrent pending sessions per link | Reuse open session for same source | open |
| LNK-02 | Links | medium | PaymentLinks PUT exists; UI never calls | No edit/disable in dashboard | Wire archive/edit actions | open |
| LNK-03 | Links | low | Disabled storefront 404 | No merchant-facing disabled page | Dedicated public status (optional) | open |
| CHK-01 | Checkout | medium | Cancel maps to `FAILED` UI | “Payment unsuccessful” for cancel | Dedicated canceled state | fixed |
| CHK-02 | Checkout | medium | Timer 0 → “Confirming…” until poll | Stuck if poll slow/fails | Set EXPIRED from API/timer | fixed |
| CHK-03 | Checkout | medium | Worker expiry `currency = 'BDT'` only | Non-BDT sessions not sweep-expired | Remove currency filter | fixed |
| CHK-04 | Checkout | low | Brand SMS auto vs env flag | UI can enable mode platform rejects | Gate UI / warn when env off | open |
| WH-01 | Webhooks | medium | Blocked deliveries have `note`; UI hides it | Merchants can’t see SSRF/block reason | Show note; disable retry for blocked | fixed |
| WH-02 | Webhooks | low | UI copy “no in-process retry” | Worker queue retries exist | Fix copy | deferred — copy-only, owner UX |
| WH-03 | Webhooks | low | Retry allowed on `blocked` | Useless retries | Disable for blocked | fixed |
| TXN-03 | Transactions | medium | `total` = `count(LIMIT 100)` | False totals | Real COUNT + pagination | fixed |
| TXN-04 | Transactions | medium | Filters omit EXPIRED/REFUNDED | Only under ALL | Add pills / API status | fixed |
| TXN-05 | Transactions | medium | Manual Confirm shown for live MFS | API rejects with SMS_EVIDENCE_REQUIRED | Hide for live MFS | fixed |
| TXN-06 | Transactions | low | `methodFilter` unused | Dead code | Wire or remove | fixed |
| TXN-07 | Transactions | medium | Reconciliation pending ignores ledger mode | Mixes test+live | Filter by mode | fixed |
| KEY-01 | API keys | medium | IntegrationSnippets hardcode host | Wrong for self-host/staging | Use `NEXT_PUBLIC_APP_URL` / relative | fixed |
| KEY-02 | API keys | low | `api-client` still has 410 merchant key routes | Dead client APIs | Remove or redirect to Brands | open |
| SET-02 | Landing | low | `Number(amount)` on landing save | Float money | Keep string / GpMoney | open |
| UX-01 | Cross-cut | medium | No `error/loading/not-found.tsx` in dashboard/marketing | No segment boundaries | Add route-group boundaries | fixed |
| UX-02 | Cross-cut | medium | Header ledger `useState` reads `window` | Hydration / first-paint mode skew | Init live; set in `useEffect` | fixed |
| UX-03 | Cross-cut | low | Transactions use raw Modal vs ConfirmDialog | Inconsistent destructive UX | Migrate to ConfirmDialog | open |
| TYPE-01 | Contracts | high | See MONEY-01 `netAmount` | Wrong sign in presenter | Fix presenter + TS docs | fixed |
| TYPE-02 | Contracts | medium | `User` missing `emailVerified`, credits, subscription… | UI can’t type banner/gates | Extend `api.ts` | fixed |
| TYPE-03 | Contracts | medium | Method/Checkout/Settings/Gateway missing fields | Defensive gaps | Extend types / normalize presenters | open |
| TIME-01 | Time | medium | `formatDate` uses browser TZ | Billing/copy is Asia/Dhaka | Default dashboard TZ Asia/Dhaka | fixed |
| TIME-02 | Money | medium | Presenters/metrics use `(float)` | Drift vs GpMoney strings | Prefer GpMoney / string JSON | open |

## Oversized files (Step C candidates)

| File | Lines |
|------|------:|
| `src/app/(dashboard)/admin/page.tsx` | 1786 |
| `src/app/(dashboard)/methods/page.tsx` | 1766 |
| `backend/src/features/checkout/CheckoutController.php` | 1532 |
| `backend/src/lib/Db.php` | 1455 |
| `backend/src/features/gateways/GatewaysController.php` | 1291 |
| `src/features/checkout/components/HostedCheckoutModal.tsx` | 1181 |
| `src/app/(dashboard)/brands/page.tsx` | 803 |
| `src/app/(dashboard)/devices/page.tsx` | 725 |
| `src/app/(dashboard)/transactions/page.tsx` | 644 |

## Deferred (needs owner decision)

| ID | Question |
|----|----------|
| BILL-03 | Auto-start plan checkout from `?plan=` or keep highlight-only? |
| LNK-01 | Reuse open checkout session per payment link (may surprise multi-tab buyers)? |
| TEAM-03 | Should platform admins bypass team permission matrix when acting as teammate? |
| WS-05 | Keep advanced test ledger behind flag only, or expose mode toggle for all merchants? |
