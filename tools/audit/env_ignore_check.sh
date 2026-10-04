#!/usr/bin/env bash
# 16.1 / bece53a review: real env files are ignored everywhere; tracked templates stay tracked.
#   bash tools/audit/env_ignore_check.sh   (exit 0 = pass)
set -uo pipefail
cd "$(dirname "$0")/../.."
fail=0
for app in . admin backend deploy patient-app patient-web provider-app; do
  for f in .env .env.local .env.production .env.staging; do
    git check-ignore -q --no-index "$app/$f" || { echo "NOT IGNORED: $app/$f"; fail=1; }
  done
done
for t in $(git ls-files | grep -E '(^|/)\.env[^/]*\.example$'); do
  git check-ignore -q --no-index "$t" && { echo "TEMPLATE IGNORED: $t"; fail=1; }
done
[ "$fail" = 0 ] && echo "PASS env ignore rules"
exit "$fail"
