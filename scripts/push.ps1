# ==============================================================================
# GressPay One-Click Git Push Script (PowerShell)
# Repository: https://github.com/extshefat/GressPay
# Branch: main
# Author: EXT SHEFAT <tradershefat8@gmail.com>
# ==============================================================================
param (
    [string]$Message = ""
)

$ErrorActionPreference = "Stop"
$RepoDir = Split-Path -Parent $PSScriptRoot
Set-Location $RepoDir

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  GressPay Automated GitHub Push Tool" -ForegroundColor Cyan
Write-Host "  Target: https://github.com/extshefat/GressPay" -ForegroundColor Gray
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Verify Git remote
$remoteUrl = git remote get-url origin 2>$null
if (-not $remoteUrl) {
    Write-Host "Setting remote origin..." -ForegroundColor Yellow
    git remote add origin "https://github.com/extshefat/GressPay.git"
}

# 2. Ensure Author identity is set
git config user.name "EXT SHEFAT"
git config user.email "tradershefat8@gmail.com"

# 3. Check for unstaged/uncommitted changes
$status = git status --porcelain
if (-not $status) {
    Write-Host "[OK] No changes detected. Repository is already clean and up to date." -ForegroundColor Green
    exit 0
}

# 4. Determine commit message
if ([string]::IsNullOrWhiteSpace($Message)) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $Message = "feat: update GressPay codebase ($timestamp)"
}

Write-Host "Staging all files..." -ForegroundColor Yellow
git add -A

Write-Host "Committing with message: '$Message'..." -ForegroundColor Yellow
git commit -m "$Message"

Write-Host "Pushing to GitHub (origin main)..." -ForegroundColor Yellow
git push origin main

if ($LASTEXITCODE -eq 0) {
    $commitHash = (git rev-parse --short HEAD)
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "  SUCCESSFULLY PUSHED TO GITHUB!" -ForegroundColor Green
    Write-Host "  Commit: $commitHash" -ForegroundColor Green
    Write-Host "  Branch: main" -ForegroundColor Green
    Write-Host "  View live: https://github.com/extshefat/GressPay/tree/main" -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Push failed. Please check network connection or permissions." -ForegroundColor Red
    exit 1
}
