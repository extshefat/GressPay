# Migration 001 — Phase 1 payment safety (2026-10-24)

Additive only. Applied automatically via `GpDb::ensureExtras()` on boot for existing DBs; also reflected in `install.sql` / `install.mysql.sql` for fresh installs.

## Changes

1. `gp_payment_links.ledger_mode` — `VARCHAR(8) NOT NULL DEFAULT 'live'`
   - Set from merchant actor mode when creating a link (`test` vs `live`).
   - Public checkout `init` reads this column; buyers cannot override.

2. Indexes:
   - `gp_transactions (brand_id, trx_id)` (non-unique; completion uniqueness also enforced in `CheckoutController::markPaid`)
   - `gp_transactions (status)`
   - `gp_sms_data (brand_id, trx_id, status)` (lookup)
   - **Unique SMS evidence** (additive via `ensureExtras` / install scripts):
     - MySQL / SQLite: `UNIQUE` on `gp_sms_data (brand_id, trx_id)` as `uq_gp_sms_brand_trx`
     - PostgreSQL: `UNIQUE INDEX uq_gp_sms_brand_trx_lower ON gp_sms_data (brand_id, lower(trx_id))`
     - Also unique on idempotency / evidence keys where present (`uq_gp_sms_idempotency`, `uq_gp_sms_evidence`)
   - Concurrent duplicate inserts are rejected at the DB layer; companion ingest maps that to `DUPLICATE_SMS`.

3. Extras (also via `ensureExtras`):
   - `gp_webhook_deliveries`, `gp_provider_orders`
   - `gp_binance_callback_nonces` (UNIQUE nonce — callback replay protection)
   - `gp_audit_log` (merchant Binance reconcile / ops actions)
   - Filtered unique indexes on trade/hash where SQLite supports them; MySQL relies on app + unique when values set. Production logs schema index failures without silent ignore of CREATE TABLE errors.

4. Match-time SMS window (`CheckoutController::smsWithinSessionWindow`):
   - `received_at` must fall within session `created_at − 120s` … `expires_at`, max age 48h, and not more than 300s in the future.
   - Applied in `matchingSms` / `matchingSmsByAmount` when a session is known, and again in `markPaid`.

## Behavior (no data rewrite)

- Existing links without the column get `live` via DEFAULT.
- Existing completed rows unchanged.
- Live verify no longer auto-completes without SMS / merchant confirm / test ledger.
