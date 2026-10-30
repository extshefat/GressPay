#!/bin/sh
# Fail the Next build if git merge conflict markers were committed (Alpine/busybox safe).
set -eu

found=0
for f in $(find src -type f \( -name '*.tsx' -o -name '*.ts' -o -name '*.jsx' -o -name '*.js' \) 2>/dev/null); do
  if grep -qE '^(<<<<<<<|>>>>>>>)' "$f" 2>/dev/null; then
    echo "error: merge conflict markers in $f" >&2
    found=1
  fi
done

if [ "$found" -ne 0 ]; then
  echo "error: fix conflict markers under src/ before deploy" >&2
  exit 1
fi
