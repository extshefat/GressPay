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
