# Phase 5 — Before / after notes

Scope: dashboard shell, overview checklist/alerts, admin tab restructure, Google OAuth 502 resilience. API contracts and permission checks are unchanged unless noted.

## Google sign-in (`/login`, `/register`)

| Before | After | Deliberately unchanged |
|--------|-------|------------------------|
| Upstream HTML/empty 502 surfaced as `API Error: 502` | BFF maps 502–504 non-JSON to `PHP_GATEWAY` JSON; retries Google URL; AuthCard explains PHP restart / `GRESSPAY_PHP_URL` | OAuth PKCE, redirect URI resolution, account linking |
| Compose web started without waiting on php health | `depends_on: php: condition: service_healthy` | Coolify env values themselves |

## Shell (`layout`, sidebar, header)

| Before | After | Deliberately unchanged |
|--------|-------|------------------------|
| Flat nav + Automation block | Collect / Setup / Account / Platform admin groups; collapsible icons-only (persisted) | Route paths and rewrite `/dashboard/*` → `/*` |
| Live badge only | Live/Test toggle + persistent Test ledger strip | Ledger mode header `X-GressPay-Mode` semantics |
| No command palette | Ctrl/Cmd+K jump + client TrxID filter + create link | No new npm deps |
| Banners always shown | Dismissible session prompts (txn hard-limit still non-dismiss forever) | Plan limit enforcement |

## Overview

| Before | After | Deliberately unchanged |
|--------|-------|------------------------|
| Compact setup list | First-run checklist with done/next/todo from `setupSteps` | Metrics endpoint fields |
| No ops alerts | Device offline / no gateway / unmatched SMS alerts | Chart library still unused (SVG `SimpleVolumeChart`) |

## Feature pages (transactions, methods, devices, keys, webhooks, …)

| Before | After | Deliberately unchanged |
|--------|-------|------------------------|
| Client search only | Additive API `q`/`search` on transactions list | Existing filters, drawers, ConfirmDialog flows; full Stepper redesign deferred where already working |

## Platform admin

| Before | After | Deliberately unchanged |
|--------|-------|------------------------|
| Mixed tab labels; audit buried under health | Tabs: Accounts, Plans & lifetime, Admin overrides, Readiness/health, Audit log, Support | Mutation endpoints, audit write paths, gateway override APIs |
| Operator env flags not shown | Read-only crypto / SMS-auto toggles on health | Flags remain Coolify-only (not editable in UI) |

## Quality

- Request de-duplication for concurrent identical GETs in `api-client`.
- `QA_CHECKLIST.md` Phase 5 section added.
