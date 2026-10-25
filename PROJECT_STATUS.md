# GressPay — project status

**Date:** 2026-10-25  
**Milestone:** Multi-gateway instances + Cloudflare R2 QR (presigned upload)  
**Deploy this run:** false  

## Per-rail status

| Rail | Status | Notes |
|------|--------|--------|
| bKash / Nagad | **multi-gateway** | Dashboard gateways + optional R2 QR; SMS match uses gateway_id + number when multi-account |
| Binance Pay | **brand sealed creds** | No QR file; Merchant API only |
| USDT TRC-20 | **gateway address** | Optional QR; on-chain verify against selected gateway |

## Storage

| What | Where |
|------|--------|
| Gateway config / QR metadata | MySQL `gp_gateways` |
| QR image bytes | Private Cloudflare R2 |
| Platform secrets | Coolify env on PHP API |

## Verification

| Check | Where |
|-------|--------|
| `tsc` + live build | Local Node / CI |
| `php tests/run.php` | GitHub Actions PHP job (includes gateway/SMS multi-account) |
| Live R2 upload | Requires owner Coolify R2 secrets — not run in this session |

## Docs

- [`../COOLIFY_DEPLOYMENT.md`](../COOLIFY_DEPLOYMENT.md)
- [`../DEPLOYMENT_CHECKLIST.md`](../DEPLOYMENT_CHECKLIST.md)
- [`backend/GressPay-API.md`](backend/GressPay-API.md)
