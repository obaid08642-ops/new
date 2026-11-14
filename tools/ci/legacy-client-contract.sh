#!/bin/bash
# R12: the current backend must still accept what every frozen released mobile build sends (contracts/released-clients/*.json). Run from the repo root after `npm ci` in backend/.
# For each file: tools/audit/dtocheck.js joins the frozen write calls with the backend DTOs (whitelist + forbidNonWhitelisted + required fields) and exits 1 on any mismatch,
# i.e. a call that would now be answered with HTTP 400. Request bodies only: a removed or renamed RESPONSE field is not covered (see the doc).
set -uo pipefail
shopt -s nullglob
DIR=${CONTRACT_DIR:-contracts/released-clients}
files=("$DIR"/*.json)
[ ${#files[@]} -gt 0 ] || { echo "legacy-client-contract: no frozen contracts in $DIR (nothing to protect yet)"; exit 0; }
rc=0
for f in "${files[@]}"; do
  out=$(node tools/audit/dtocheck.js "$f" 2>&1); code=$?
  echo "== $f: $(echo "$out" | tail -1)"
  if [ $code -ne 0 ]; then echo "$out" | grep -E '^(✗|MISMATCH|x )|mismatch' | head -20; rc=1; fi
done
[ $rc -eq 0 ] && echo "legacy-client-contract: every frozen build is still accepted" || echo "legacy-client-contract: FAILED - a released build would get HTTP 400; keep the old field accepted (expand/contract, docs/platform/R4) or raise min_version first"
exit $rc
