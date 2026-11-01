#!/bin/bash
# Commission defaults (owner decision 2026-11-01). Until finance_config `commissions` is seeded the resolver charges 10 for every service type, while the admin
# screen shows pharmacy 10, doctor 15, lab 12, radiology 12, nursing 15. Runs `node dist/scripts/commission-seed.js` INSIDE the backend container
# (its own MONGO_URL / DB_NAME). It writes only fields that are MISSING, each as a compare-and-set on "field absent": a value the admin set (even 0) is never changed.
#   (APPLY empty)  DRY RUN: prints what is missing and what is already set (service names and percents only). Nothing is written.
#   APPLY=yes      (set in this file by the reviewer after reading the dry run): writes the missing defaults, then checks that nothing is missing.
set -u
APPLY="yes"
CT=${COMMISSION_SEED_CONTAINER:-nabdah-backend}
DK="sudo -n docker"
echo "## commission-seed"
say() { echo "status: commission-seed: $*"; }
health() { $DK inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$1" 2>/dev/null; }
[ "$(health "$CT")" = healthy ] || { say "ABORT $CT is not healthy"; exit 1; }
$DK exec "$CT" test -f dist/scripts/commission-seed.js || { say "ABORT the running image has no commission-seed tool: deploy the release first"; exit 1; }
ARGS=""; [ "$APPLY" = yes ] && ARGS="--apply"
OUT=$($DK exec "$CT" node dist/scripts/commission-seed.js $ARGS 2>&1); RC=$?
echo "$OUT" | sed 's/^/status: commission-seed: /' | cut -c1-900
[ $RC -eq 0 ] || { say "FAILED (exit $RC)"; exit 1; }
if [ "$APPLY" = yes ]; then say "applied and verified (nothing missing)"; else say "dry run only: nothing was written. To apply, set APPLY=yes in this task (review the lines above first)"; fi
