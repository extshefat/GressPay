# Phase 1 security review

Branch: `phase-1-security`. No push or deployment was performed. Changes are
implemented for review; backend/runtime validation remains pending CI. The npm
manifest is staged for Next 15.5.29 and ESLint, while package-lock.json and installed
packages deliberately remain unchanged under the owner's instruction.

## Findings and regressions

Primary commits below identify the original concern; later review commits on this
branch add race protection, compatibility handling, storage cleanup and CI checks.
All backend regressions were added to `backend/tests/run.php`. The existing
PostgreSQL race suite remains in `backend/tests/postgres.php`; additional MySQL
coverage is in `backend/tests/mysql.php`. None was executed by this phase agent.

| Finding | Confirmed | Primary fix commit | Regression/check |
| --- | --- | --- | --- |
| 1.1 | Yes | 6b47c50 | Untrusted peer cannot spoof forwarded client IP; Trusted proxy selects client from right; Rate bucket rejects excess request; Five failures throttle same normalized account; web proxy header smoke |
| 1.2 | Yes | 2fd353f, 4b2d907 | Registration cannot pre-hijack allowlisted admin privileges; Verification token is single use; Google linking clears pre-hijack password and revokes sessions; Admin role/lifetime grant rejects unverified target |
| 1.3 | Yes | af4ec02 | Indexed lookup authenticates device older than newest 500; Invalid prefix returns no device; Indexed lookup rejects revoked device |
| 1.4 | Yes | 3ef80e2 | Existing database upgrade verifies current admins and Google accounts only; Existing database upgrade preserves brands and stamps versions once; MySQL migration runner is repeatable |
| 1.5 | Partly | e2ce80a | CI: Non-root FPM runtime smoke; Ensure Compose variants match. PHP already used www-data and jobs/WebhookWorker.php already was a thin bootstrap; Next ran as root and API used php -S |
| 1.6 | Partly | e4ddb71 | Safe HTTP blocks reserved address fixtures; Discord suffix impostor rejected; Discord non-webhook rejected. Existing code already blocked IPv4 CGNAT, but missed mapped/reserved IPv6 and DNS pinning |
| 1.7 | Yes | caa26c7 | Legacy Telegram token opens and migrates; Telegram token sealed at rest; Alert credential purposes cannot be swapped |
| 1.8 | Yes | 025773e | QR rejects SVG, executable payload and oversized input; QR rejects appended image polyglot; QR re-encodes validated raster; Unreferenced sanitized QR file is removed safely |
| 1.9 | Partly | b32993a | Second session cannot reuse normalized TrxID; Other tenant receipt is independent; TrxID mode rejects different payer; existing PostgreSQL concurrent equal-amount orders check. Atomic SMS claiming and some SQLite/PG uniqueness already existed |
| 1.10 | Yes | 2fd353f, 7b775d9 | Logout-all endpoint revokes actual signed session; Concurrent old credential cannot mint a refreshed token version; Login upgrades existing bcrypt cost to twelve; Password change updates hash and revokes sessions atomically; Account disable revokes sessions in the same update |
| 1.11 | Yes | 35d31c9 | scripts/check-security-web.mjs: streamed/declared body limits, token shape, cookie flags, rendered theme CSP hash, proxy header stripping; TypeScript and production build with existing dependencies |

## Current verification evidence

- `npx --no-install tsc --noEmit`: passed after frontend changes.
- `NEXT_PUBLIC_DATA_SOURCE=live NEXT_TELEMETRY_DISABLED=1 npm run build`: passed;
  output identifies installed Next 15.1.0, **not** the staged patch version.
- `node scripts/check-security-web.mjs`: passed against that built web server with
  a Node-only test upstream. No PHP runtime was exercised by that smoke test.
- `cmp docker-compose.yml docker-compose.yaml`, `sh -n backend/deploy/entrypoint.sh`,
  and `git diff --check`: passed. These do not validate container startup or PHP.
- PHP lint, SQLite/backend regression tests, PostgreSQL/MySQL checks, FPM/worker
  image startup, Android CI, SMTP delivery, browser accessibility/visual coverage,
  actual Traefik header topology and real provider payments: not run in this phase.
- ESLint/new Next version: not installed or tested. CI's frozen npm install will
  require the owner to refresh and commit the lockfile first.

## Deployment and compatibility notes

See `COOLIFY_DEPLOYMENT.md` → Phase 1 security rollout for complete instructions.
No destructive schema operation was added. Compatibility baseline runs once,
under a DB migration lock; production HTTP only connects to the prepared schema.
Conflicting legacy normalized transactions stop an upgrade for manual review.
Current admins and Google-verified accounts are marked verified. Other local users
must verify email before live keys/new live checkout. Legacy JWTs at version zero
remain valid until that account's version changes; new tokens have jti/tv claims.

Existing brands retain payer-match off so old buyer integrations continue working;
new brands default on. The optional field is explained in brand settings and the
buyer phone label. A receipt without payer_phone remains compatible with older
companion uploads. Duplicate receipt decisions are scoped to brand and ledger.

Keep the `api-storage` volume: QR data URLs are replaced by sanitized PNG files,
served with image/png and nosniff, using opaque capability URLs. Invalid legacy
images are retained in the DB with failed status and are not served. Legacy R2
upload intents are validated/sanitized on completion; the writable candidate is
never published as the validated QR. GD is installed in the API image and PHP CI.
Active legacy devices whose sealed token cannot be recovered require key rotation;
no global bcrypt fallback remains.

The trusted IP defaults fail closed to aggregated buckets. Real per-client limits
require correct ingress CIDRs/hop counts and blocked direct Next/API exposure.
The deployment assumptions must be verified against the owner's Traefik setup.
Merchant outbound requests refuse inherited HTTPS/ALL proxies because normal
CONNECT proxy resolution would invalidate CURLOPT_RESOLVE pinning. Proxy-only
production installations require a supported pinned-destination transport before
webhook/alert delivery can be considered ready; do not bypass platform policy.

Public payment/checkout routes, webhook JSON/HMAC headers, SDK and shipped APK
endpoints retain their shapes. Added verification/password/logout-all endpoints
are additive. Alert credentials are write-only: discordWebhookUrl remains an empty
legacy field and discordWebhookUrlSet indicates configuration. SMTP fallback logs
links only in development. CSP enforcement for scripts remains a staged rollout;
checkout/store embedding is preserved and the theme bootstrap has an exact hash.

## Commands for the owner

Use an approved development machine for dependency refresh, and CI/disposable
Linux databases for backend checks. Never run the database integration suites
against a production database. No secret values should be pasted into chat.

```sh
# Repository root; required because the agent did not run installs.
npm install
npm run lint
npx tsc --noEmit
NEXT_PUBLIC_DATA_SOURCE=live npm run build
# Review and commit package-lock.json changes on the phase branch.

# CI / PHP 8.2+ with bcmath, SQLite and GD:
find backend -name '*.php' -print0 | xargs -0 -n1 php -l
php backend/tests/run.php
# With the disposable DB_* / JWT_SECRET / APP_ENCRYPTION_KEY settings from verify.yml:
php backend/tests/postgres.php  # DB_DRIVER=pgsql
php backend/tests/mysql.php     # DB_DRIVER=mysql

# Staging VPS/Coolify only, after reviewing lockfile and CI:
docker compose build
docker compose run --rm php php bin/migrate.php
docker compose up -d
# Check the existing public /api/v1/health route and the rollout workflows.
```

Configure SMTP_HOST, SMTP_PORT, SMTP_ENCRYPTION, SMTP_FROM, SMTP_USERNAME and
SMTP_PASSWORD securely. Also verify APP_URL, WEB_TRUSTED_PROXY_HOPS,
TRUSTED_PROXIES, TRUSTED_NEXT_PROXIES and TRUSTED_PROXY_HOPS. Existing JWT and
AES keys must be retained. R2_PUBLIC_BASE_URL is an exact web build-time image
origin. Never remove the API storage volume during rollout.

## Files changed

- `.github/workflows/verify.yml`
- `.gitignore`
- `COOLIFY_DEPLOYMENT.md`
- `Dockerfile`
- `backend/.dockerignore`
- `backend/.env.example`
- `backend/Dockerfile`
- `backend/bin/migrate.php`
- `backend/deploy/entrypoint.sh`
- `backend/deploy/nginx.conf`
- `backend/deploy/nginx.docker.conf`
- `backend/deploy/php-security.ini`
- `backend/src/bootstrap.php`
- `backend/src/features/admin/AdminController.php`
- `backend/src/features/auth/AuthController.php`
- `backend/src/features/brands/BrandsController.php`
- `backend/src/features/checkout/CheckoutController.php`
- `backend/src/features/companion/CompanionController.php`
- `backend/src/features/gateways/GatewaysController.php`
- `backend/src/features/merchant/MerchantController.php`
- `backend/src/jobs/WebhookWorker.php`
- `backend/src/lib/Auth.php`
- `backend/src/lib/Config.php`
- `backend/src/lib/Db.php`
- `backend/src/lib/EmailVerification.php`
- `backend/src/lib/Jwt.php`
- `backend/src/lib/Mailer.php`
- `backend/src/lib/MerchantSecrets.php`
- `backend/src/lib/Migrations.php`
- `backend/src/lib/PlanLimits.php`
- `backend/src/lib/Presenters.php`
- `backend/src/lib/QrStorage.php`
- `backend/src/lib/RateLimiter.php`
- `backend/src/lib/Router.php`
- `backend/src/lib/SafeHttp.php`
- `backend/src/lib/TrxClaims.php`
- `backend/src/lib/Webhook.php`
- `backend/src/providers/GoogleOAuthClient.php`
- `backend/src/providers/R2Client.php`
- `backend/tests/mysql.php`
- `backend/tests/run.php`
- `deploy/nginx.conf`
- `docker-compose.yaml`
- `docker-compose.yml`
- `docs/PHASE1_SECURITY.md`
- `eslint.config.mjs`
- `next.config.ts`
- `package.json`
- `scripts/check-security-web.mjs`
- `src/app/(auth)/verify-email/page.tsx`
- `src/app/(dashboard)/brands/page.tsx`
- `src/app/(dashboard)/layout.tsx`
- `src/app/(dashboard)/settings/page.tsx`
- `src/app/api/auth/session/route.ts`
- `src/app/api/v1/[...path]/route.ts`
- `src/app/layout.tsx`
- `src/features/auth/AuthCard.tsx`
- `src/features/auth/EmailVerificationBanner.tsx`
- `src/features/checkout/components/HostedCheckoutModal.tsx`
- `src/lib/theme-script.ts`
- `src/lib/types/api.ts`
