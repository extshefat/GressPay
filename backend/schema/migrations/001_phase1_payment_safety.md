# Migration 001 — Phase 1 payment safety (2026-10-24)

Additive only. Applied automatically via `GpDb::ensureExtras()` on boot for existing DBs; also reflected in `install.sql` / `install.mysql.sql` for fresh installs.

## Changes

1. `gp_payment_links.ledger_mode` — `VARCHAR(8) NOT NULL DEFAULT 'live'`
   - Set from merchant actor mode when creating a link (`test` vs `live`).
   - Public checkout `init` reads this column; buyers cannot override.

2. Indexes (non-unique; completion uniqueness enforced in `CheckoutController::markPaid`):
   - `gp_transactions (brand_id, trx_id)`
   - `gp_transactions (status)`
   - `gp_sms_data (brand_id, trx_id, status)`

3. Extras (also via `ensureExtras`):
   - `gp_webhook_deliveries`, `gp_provider_orders`
   - `gp_binance_callback_nonces` (UNIQUE nonce — callback replay protection)
   - `gp_audit_log` (merchant Binance reconcile / ops actions)
   - Filtered unique indexes on trade/hash where SQLite supports them; MySQL relies on app + unique when values set. Production logs schema index failures without silent ignore of CREATE TABLE errors.

## Behavior (no data rewrite)

- Existing links without the column get `live` via DEFAULT.
- Existing completed rows unchanged.
- Live verify no longer auto-completes without SMS / merchant confirm / test ledger.
