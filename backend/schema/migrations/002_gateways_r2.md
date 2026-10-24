# Migration 002 — Gateway instances + R2 QR metadata (2026-10-25)

Applied via `GpDb::ensureExtras()` on boot (`CREATE TABLE IF NOT EXISTS gp_gateways`, `ALTER` for `gp_transactions.gateway_id`, idempotent backfill from `gp_methods`).

## Behavior

1. Existing `gp_methods.options` destinations are copied into one `gp_gateways` row per brand+method when no gateway exists yet.
2. `gp_methods` rows are **not** deleted.
3. QR image bytes live in Cloudflare R2; MySQL stores `qr_object_key` / mime / size / checksum / status only.
