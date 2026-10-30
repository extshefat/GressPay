#!/usr/bin/env bash
# Fail the Next build if git merge conflict markers were committed (breaks Coolify web image).
set -euo pipefail
if rg -q '^<<<<<<<|^>>>>>>>' src -g '*.tsx' -g '*.ts' -g '*.jsx' -g '*.js' 2>/dev/null; then
  echo "error: merge conflict markers found under src/ — fix before deploy" >&2
  rg '^<<<<<<<|^>>>>>>>' src -g '*.tsx' -g '*.ts' -g '*.jsx' -g '*.js' || true
  exit 1
fi
