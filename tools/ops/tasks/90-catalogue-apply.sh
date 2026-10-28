#!/bin/bash
# Catalogue apply (owner-approved 2026-10-25), two runs of the same task, one change per run, every step checked.
#   Run 1 (EXPECT_PLAN_SHA empty): DRY RUN. Prints the plan (counts per step) and its SHA-256 as `status:` lines; nothing is written.
#   Run 2 (EXPECT_PLAN_SHA = the hash of run 1, set in this file by the reviewer after the owner has read the counts): APPLY.
# Order of the apply, inside the backend container (`node dist/scripts/catalogue-apply.js`, which uses the container's own MONGO_URL and
# DB_NAME and prints counts, hashes and names only, never a value of the environment):
#   0. pre-checks: backend healthy, the image carries the tool; optional inputs copied into the container
#   1. plan again and compare its hash with EXPECT_PLAN_SHA (a different hash = nothing is written)
#   2. BACKUP of every field the plan changes (before-images) and every document it inserts, read back and hashed; a copy goes to $B on the host
#   3. the guarded writes (each one only while the field still holds the value the plan saw), then a fresh plan must be EMPTY and the
#      document counts must be the expected ones
#   4. any mismatch (or a verify that fails): ROLLBACK from the backup, then the counts are checked again; exit 1
# Steps (see backend/src/modules/catalogs/catalogue-apply.steps.ts): medicine name translations (#1844, the reviewed CSV shipped in the
# image), Arabic/English names of regions, cities and insurers (owner decision: two languages only), medicine-name hygiene and the
# owner-approved Arabic name fixes (#1556), districts (item 5).
# The districts extract ships INSIDE the image (backend/src/modules/location/data/districts-extract.v1.json) and is used by default.
# Optional inputs on the host (skipped when absent): $IN/districts.json  (an OVERRIDE of the packaged extract, same format)
#                                                    $IN/approved-name-fixes.csv  (the owner-approved rows of fix-catalogue-names)
#                                                    $IN/product-translations.json  (missing product texts translated from the existing ones by
#                                                       scripts/translate-product-content.ts; written only into EMPTY fields, marked machine-translated)
#                                                    $IN/radiology-approve.json  ({"approve": ["MAMMO", ...]}: the radiology scans a medical reviewer approved to show to
#                                                       patients; without it the radiology step only hides the legacy duplicates and approves nothing)
# After a change of medicine names, add `cf-purge-api` to tools/ops/RUN for that run so the cached product pages refresh.
set -u
EXPECT_PLAN_SHA=""
D=${OPS_DEPLOY_DIR:-/opt/nabdah/deploy}
B=${OPS_BACKUP_DIR:-/opt/nabdah/backups}
IN=${OPS_CATALOGUE_DIR:-/opt/nabdah/catalogue}
CT=${CATALOGUE_CONTAINER:-nabdah-backend}
TS=$(date -u +%Y%m%dT%H%M%SZ)
DK="sudo -n docker"
TOOL="node dist/scripts/catalogue-apply.js"
echo "## catalogue-apply"

say() { echo "status: catalogue-apply: $*"; }
health() { $DK inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$1" 2>/dev/null; }
# the value of a top-level JSON key from one line of the tool's output (numbers, hashes and booleans only)
jval() { sed -n "s/.*\"$1\":\([^,}]*\).*/\1/p" | head -1 | tr -d '"'; }
# the first output line of the tool that mentions \$1
tool() { $DK exec "$CT" $TOOL "$@" 2>&1; }

# --- 0. pre-checks
[ "$(health "$CT")" = healthy ] || { say "ABORT $CT is not healthy"; exit 1; }
$DK exec "$CT" test -f dist/scripts/catalogue-apply.js || { say "ABORT the running image has no catalogue-apply tool: deploy the release first"; exit 1; }
ARGS=""
if sudo -n test -f "$IN/districts.json"; then
  sudo -n cat "$IN/districts.json" | $DK exec -i "$CT" sh -c 'cat > /tmp/cat-districts.json' && ARGS="$ARGS --districts=/tmp/cat-districts.json" && say "input districts.json copied in"
fi
if sudo -n test -f "$IN/approved-name-fixes.csv"; then
  sudo -n cat "$IN/approved-name-fixes.csv" | $DK exec -i "$CT" sh -c 'cat > /tmp/cat-name-fixes.csv' && ARGS="$ARGS --name-fixes=/tmp/cat-name-fixes.csv" && say "input approved-name-fixes.csv copied in"
fi
if sudo -n test -f "$IN/product-translations.json"; then
  sudo -n cat "$IN/product-translations.json" | $DK exec -i "$CT" sh -c 'cat > /tmp/cat-product-translations.json' && ARGS="$ARGS --product-translations=/tmp/cat-product-translations.json" && say "input product-translations.json copied in"
fi
if sudo -n test -f "$IN/radiology-approve.json"; then
  sudo -n cat "$IN/radiology-approve.json" | $DK exec -i "$CT" sh -c 'cat > /tmp/cat-radiology-approve.json' && ARGS="$ARGS --radiology-approve=/tmp/cat-radiology-approve.json" && say "input radiology-approve.json copied in"
fi
cleanup_inputs() { $DK exec "$CT" sh -c 'rm -f /tmp/cat-districts.json /tmp/cat-name-fixes.csv /tmp/cat-product-translations.json /tmp/cat-radiology-approve.json' >/dev/null 2>&1; }

# --- 1. plan
PLAN=$(tool plan $ARGS); RC=$?
[ $RC -eq 0 ] || { say "ABORT plan failed (exit $RC): $(echo "$PLAN" | tail -1 | cut -c1-200)"; cleanup_inputs; exit 1; }
SHA=$(echo "$PLAN" | jval plan_sha)
TOTAL=$(echo "$PLAN" | jval total_changes)
say "plan sha=$SHA total_changes=$TOTAL"
echo "$PLAN" | sed -E 's/"inputs":\{[^}]*\},?//' | sed 's/^/status: catalogue-apply: plan /' | cut -c1-900
if [ -z "$EXPECT_PLAN_SHA" ]; then
  say "dry run only: nothing was written. To apply, set EXPECT_PLAN_SHA=$SHA in this task (owner approval first)"
  cleanup_inputs; exit 0
fi
# EXPECT_PLAN_SHA may be a prefix of at least 32 hex characters: the public log masks any substring equal to a workflow secret, so the
# full hash is not always readable there. 32+ hex characters still name exactly one plan.
case "$EXPECT_PLAN_SHA" in *[!0-9a-f]*) say "ABORT EXPECT_PLAN_SHA is not hex"; cleanup_inputs; exit 1;; esac
[ ${#EXPECT_PLAN_SHA} -ge 32 ] || { say "ABORT EXPECT_PLAN_SHA must have at least 32 hex characters"; cleanup_inputs; exit 1; }
case "$SHA" in "$EXPECT_PLAN_SHA"*) ;; *) say "ABORT the plan changed (expected ${EXPECT_PLAN_SHA:0:12}, now ${SHA:0:12}): nothing was written, run the dry run again"; cleanup_inputs; exit 1;; esac
[ "$TOTAL" != 0 ] || { say "nothing to apply (plan is empty)"; cleanup_inputs; exit 0; }

# --- 2+3. backup, apply, verify
BK_IN=/tmp/catalogue-backup-$TS.json.gz
sudo -n mkdir -p "$B"
OUT=$(tool apply --expect="$SHA" --backup="$BK_IN" $ARGS); RC=$?
echo "$OUT" | sed 's/^/status: catalogue-apply: /' | cut -c1-700
FILE_SHA=$(echo "$OUT" | grep '"step":"backup"' | jval file_sha256)
# a copy of the backup on the host, checked against the hash the tool reported
if $DK cp "$CT:$BK_IN" "/tmp/cat-$TS.gz" >/dev/null 2>&1; then
  sudo -n cp -p "/tmp/cat-$TS.gz" "$B/catalogue-$TS.json.gz" && sudo -n chmod 600 "$B/catalogue-$TS.json.gz"
  HOST_SHA=$(sudo -n sha256sum "$B/catalogue-$TS.json.gz" | cut -d' ' -f1); rm -f "/tmp/cat-$TS.gz"
  if [ -n "$FILE_SHA" ] && [ "$HOST_SHA" = "$FILE_SHA" ]; then say "backup saved (sha256 ${HOST_SHA:0:12})"; else say "WARNING host backup hash differs from the tool's"; fi
fi
if [ $RC -eq 0 ]; then
  say "applied and verified (fresh plan is empty, counts as expected)"
  cleanup_inputs; exit 0
fi

# --- 4. rollback
if [ $RC -eq 2 ]; then say "plan changed between the checks: nothing was written"; cleanup_inputs; exit 1; fi
say "FAILED (exit $RC), rolling back from the backup"
ROLL=$(tool rollback --backup="$BK_IN"); RR=$?
echo "$ROLL" | sed 's/^/status: catalogue-apply: rollback /' | cut -c1-700
if [ $RR -eq 0 ] && [ "$(echo "$ROLL" | jval ok)" = true ]; then say "rollback complete, counts back to the backup's"; else say "ROLLBACK INCOMPLETE - needs attention (backup kept at $B/catalogue-$TS.json.gz)"; fi
cleanup_inputs
exit 1
