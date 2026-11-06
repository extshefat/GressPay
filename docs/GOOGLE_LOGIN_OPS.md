# Google Login — Coolify ops checklist

Last verified against deploy fixes on `main` (#37–#40) and BFF session proxy. Production probes from outside Cloudflare often return 403; use Coolify logs + in-network curls.

## Required env (php service)

| Variable | Notes |
|----------|--------|
| `GOOGLE_CLIENT_ID` | Google Cloud OAuth client |
| `GOOGLE_CLIENT_SECRET` | Same client |
| `GOOGLE_REDIRECT_URI` | Must be **public** HTTPS callback the browser hits, e.g. `https://<domain>/api/auth/google/callback` (or the PHP route your BFF forwards). Never `http://0.0.0.0…`. |
| `APP_PUBLIC_URL` / `NEXT_PUBLIC_APP_URL` | Canonical public origin used by `publicAppOrigin()` — no `0.0.0.0`, no bare Docker hostnames. |
| `API_PORT` | **`8080`** inside the php container. Do **not** share web `PORT=3000` with PHP or Coolify marks php Degraded / Next gets HTML 502. |
| `GRESSPAY_PHP_URL` (web) | In-compose: `http://php:8080` (same Docker network). |

## Health & 502 triage

1. Coolify: php service **healthy**, listening on **8080** (not 3000).
2. From the **web** container: `curl -sS -o /dev/null -w '%{http_code}\n' http://php:8080/api/v1/health` → expect `200`.
3. Browser: `GET /api/auth/google/start` must **302** to Google (server redirect). If the button stays on “Connecting…”, the start route is failing client-side — check Network tab + web logs.
4. After Google, callback errors must land on the public app origin (login/callback page), never `http://0.0.0.0:…`.
5. Bare `API Error: 502` from BFF usually means PHP unreachable or returning HTML; AuthCard should surface `PHP_GATEWAY` JSON after mapping.

## Google Cloud console

- Authorized redirect URIs: exact public callback URL(s) for production (and staging if used).
- Authorized JavaScript origins: public site origin only.

## Still blocked without VPS access

- Live end-to-end Google click-through when Cloudflare challenges anonymous curls.
- Confirming Coolify env actually contains the Google secrets (keys-in-chat ≠ keys-in-container).
- Provider expansion beyond Google (Phase 6+) — needs product access / credentials per provider.
