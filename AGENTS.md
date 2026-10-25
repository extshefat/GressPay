# AI AGENT INSTRUCTIONS — GressPay Workspace

> **MANDATORY RULES FOR ALL AI AGENTS (Antigravity, Cursor, Claude Code, Windsurf, Copilot, etc.)**

---

## 1. Automated GitHub Push Instructions

When the user asks you to **push**, **upload**, or **sync** changes to GitHub:

### Target Repository
- **Remote URL**: `https://github.com/extshefat/GressPay.git`
- **Primary Branch**: `main`
- **Git Author Name**: `EXT SHEFAT`
- **Git Author Email**: `tradershefat8@gmail.com`
- **Root Git Directory**: `C:\Users\XHEFAT\Desktop\My Own Paymnet GateWay\GressPay- Web`

### Authentication Credentials
- **DO NOT** ask the user for a GitHub Personal Access Token (PAT) or password.
- Git authentication is **ALREADY ACTIVE** and persistently stored in the user's **Windows Credential Manager** (`git:https://github.com` for user `extshefat`).
- The `git credential-manager` in Windows will seamlessly authenticate all pushes.

### Push Execution
Execute the push from the `GressPay- Web` directory:

```powershell
cd "C:\Users\XHEFAT\Desktop\My Own Paymnet GateWay\GressPay- Web"
git config user.name "EXT SHEFAT"
git config user.email "tradershefat8@gmail.com"
git add -A
git commit -m "feat/fix: <concise summary of changes>"
git push origin main
```

**Or simply invoke the automated script:**
```powershell
powershell -ExecutionPolicy Bypass -File "scripts/push.ps1" "feat: <message>"
```
or via cmd:
```cmd
push.bat "feat: <message>"
```

### ⚠️ CRITICAL WARNING: NEVER ASK USER TO USE GITHUB WEB UPLOADER
- **NEVER** tell the user to drag-and-drop folders (like `src/app`) into the GitHub web browser interface.
- GitHub's web interface has a strict **100-file per upload limit** and fails with an error on large Next.js directory structures.
- Always use the Git CLI commands or the scripts above to push directly.

---

## 2. Project Architecture & Workspace Structure

- **Main Web & API App**: `GressPay- Web`
  - `src/app/`: Next.js 15 App Router pages, layouts, and API proxies.
  - `backend/`: Fast vanilla PHP 8.2+ REST backend (`bootstrap.php`, `Router.php`, `Db.php`, `AuthController.php`, etc.).
  - `deploy/`: Nginx and Docker configurations.
- **Android Companion App**: `GressPay- Web/GressPay-App-Project` (and root `GressPay-App`).
- **Coolify Deployment Guide**: [`COOLIFY_DEPLOYMENT.md`](COOLIFY_DEPLOYMENT.md).

---

## 3. Core Safety & Architecture Invariants

1. **Self-Hosted VPS Model**:
   - The user runs the SaaS on their own VPS using Coolify and a persistent MySQL/MariaDB database.
   - Do NOT run heavy backend daemons, install JDK/Docker, or run persistent MySQL on the user's personal Windows laptop.

2. **Multi-Tenant Isolation**:
   - Every merchant operates within their own `brand_id`.
   - Provider credentials (Binance Pay API keys, USDT addresses, webhook secrets) are encrypted at rest with AES-256-GCM and never leaked across merchants.

3. **Payment Verification Integrity**:
   - Never mark a payment as completed purely on frontend state or button clicks.
   - bKash/Nagad require companion SMS matching.
   - Binance Pay requires official merchant order verification.
   - USDT TRC-20 requires TronGrid on-chain confirmations.

---

## Cursor Cloud specific instructions

Cloud Agent VMs develop the Next.js app and PHP API locally. Production MySQL, Coolify, and the Android SDK stay off this VM.

### Toolchain

- Node.js on the default image (22.x) runs this Next.js 15 app.
- PHP 8.3 CLI needs `pdo_sqlite`, `bcmath`, `curl`, `mbstring`, and `xml`:

```bash
sudo apt-get update
sudo apt-get install -y php-cli php-sqlite3 php-bcmath php-curl php-mbstring php-xml
```

### Install

From the repo root:

```bash
npm ci || npm install
```

`npm ci` on npm 10.9 rejects the committed lockfile (`picomatch@2.3.2` does not satisfy `picomatch@4.0.7`). The Dockerfile and `.github/workflows/verify.yml` already fall back to `npm install`. Leave `package-lock.json` unchanged unless a dependency update is the task.

### Dev servers

`backend/.env.example` is production MySQL. Booting the API from that file returns HTTP 503 until secrets exist. Local boot uses SQLite. Write `backend/.env` (gitignored) before starting PHP:

```
APP_ENV=development
DB_DRIVER=sqlite
SQLITE_PATH=storage/gresspay.sqlite
JWT_SECRET=<at least 32 characters>
APP_ENCRYPTION_KEY=<at least 32 characters>
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
GRESSPAY_CRYPTO_ALLOWED=0
```

Write `.env.local` so the dashboard talks to PHP instead of mock data:

```
NEXT_PUBLIC_DATA_SOURCE=live
NEXT_PUBLIC_API_URL=
GRESSPAY_PHP_URL=http://127.0.0.1:8080
```

- API: `cd backend && php -S 0.0.0.0:8080 -t public public/index.php` then `GET /api/v1/health`
- Web: `npm run dev -- --hostname 0.0.0.0 --port 3000`
- Browser calls `/api/v1/*`. `src/app/api/v1/[...path]/route.ts` proxies to `GRESSPAY_PHP_URL`.

Hello-world: `POST /api/v1/auth/register` with `name`, `email`, `password` (8+), and `businessName`, then `POST /api/v1/payment-links` with the returned bearer token. Hosted checkout is `/pay/<linkId>`.

### Checks

- `npx tsc --noEmit`
- `NEXT_PUBLIC_DATA_SOURCE=live npm run build` (a production build requires `live`)
- `cd backend && php tests/run.php` (SQLite, no MySQL). The JPEG magic assertion fails today: the fixture is shorter than the 12-byte minimum in `R2Client::detectImageMime`. PNG magic passes. That is product code, not a missing extension.

Android Gradle tests need JDK 17 and the Android SDK. Google, Binance, Tron, and Cloudflare R2 stay empty until those secrets are provided. Empty checkout rails mean the merchant has not connected a wallet.
