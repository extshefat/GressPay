# 003 — Gateway fees, expanded BD catalog, account plan billing

Applied via `GpDb::ensureExtras()` on boot (idempotent `ALTER` + `CREATE TABLE IF NOT EXISTS`).

## MySQL / Postgres columns on `gp_gateways`

- `gateway_fee` DECIMAL(20,8)
- `gateway_fee_type` VARCHAR(16) default `percentage` (`percentage` | `fixed`)
- `exchange_rate` DECIMAL(20,8) — Binance / USD checkout conversion hint (BDT per USD)
- `gateway_category` VARCHAR(32) — dashboard label (e.g. `mobile_banking`, `bangla_qr`)

Fees mirror into `gp_methods.options` as `percentage_charge` / `fixed_charge` for `GpFeeEngine`.

## New table `gp_account_plan_orders`

Stores **account-owner** GressPay plan purchases (My Payments). Checkout sessions use `gp_transactions.source = account-plan` on the **platform billing brand** (`gp_platform_settings.saas_billing_brand_id`).

## Platform setting

- Key: `saas_billing_brand_id`
- Admin API: `GET/PUT /api/v1/admin/billing-brand`
- Configure live gateways on that brand (same as any brand View Gateways UI).

## Coolify / VPS notes

- No new env vars required for billing.
- QR uploads still use existing R2 env; extended QR support to all BD MFS + Binance on gateway rows.
- After deploy, Super Admin should set billing brand ID and enable desired rails on that brand.
