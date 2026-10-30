#!/bin/bash
# Removal of the test providers (owner APPROVED 2026-10-29): the 8 test provider profiles listed in the image
# (backend/src/modules/catalogs/seed-data/test-data-remove.2026-10-29.json, 8-character id prefixes), their accounts and logins, their sessions and everything that
# points at them (appointments, bookings, contracts, files ...). NOT the catalogue (medicines and lab tests whose names only matched the word "test" are real products),
# not the audit trail, not the logs. It only plans and applies this ONE step (`--only=test_data`), never the other catalogue-apply steps.
#   Run 1 (EXPECT_PLAN_SHA empty): DRY RUN. Prints the counts per collection, the prefixes resolved to exact ids, and the plan's SHA-256 as `status:` lines. Nothing is written.
#   Run 2 (EXPECT_PLAN_SHA = the hash of run 1, set in this file by the reviewer after the owner read the counts): backup of every document that will be deleted (read back and hashed;
#          a copy on the host), deletion by exact _id only (each only while the document is still the one the plan saw), a fresh plan must be EMPTY; any mismatch rolls back from the backup.
# Same mechanics and checks as 90-catalogue-apply. After it, add `cf-purge-api` to tools/ops/RUN so cached provider pages refresh.
set -u
EXPECT_PLAN_SHA="87bb034b3a9e7a4d34dc62ddb0b02808442763e1d240da10993a8311aa99df1c"
D=${OPS_DEPLOY_DIR:-/opt/nabdah/deploy}
B=${OPS_BACKUP_DIR:-/opt/nabdah/backups}
IN=${OPS_CATALOGUE_DIR:-/opt/nabdah/catalogue}
CT=${CATALOGUE_CONTAINER:-nabdah-backend}
TS=$(date -u +%Y%m%dT%H%M%SZ)
DK="sudo -n docker"
TOOL="node dist/scripts/catalogue-apply.js"
echo "## test-data-remove"

say() { echo "status: test-data-remove: $*"; }
health() { $DK inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$1" 2>/dev/null; }
# the value of a top-level JSON key from one line of the tool's output (numbers, hashes and booleans only)
jval() { sed -n "s/.*\"$1\":\([^,}]*\).*/\1/p" | head -1 | tr -d '"'; }
# the first output line of the tool that mentions \$1
tool() { $DK exec "$CT" $TOOL "$@" 2>&1; }

# --- 0. pre-checks
[ "$(health "$CT")" = healthy ] || { say "ABORT $CT is not healthy"; exit 1; }
$DK exec "$CT" test -f dist/scripts/catalogue-apply.js || { say "ABORT the running image has no catalogue-apply tool: deploy the release first"; exit 1; }
ARGS="--only=test_data --test-data-remove=packaged"
cleanup_inputs() { :; }

# --- 1. plan
PLAN=$(tool plan $ARGS); RC=$?
[ $RC -eq 0 ] || { say "ABORT plan failed (exit $RC): $(echo "$PLAN" | tail -1 | cut -c1-200)"; cleanup_inputs; exit 1; }
SHA=$(echo "$PLAN" | jval plan_sha)
TOTAL=$(echo "$PLAN" | jval total_changes)
say "plan sha=$SHA total_changes=$TOTAL"
echo "$PLAN" | sed -E 's/"inputs":\{[^}]*\},?//' | sed 's/^/status: test-data-remove: plan /' | cut -c1-900
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
BK_IN=/tmp/test-data-backup-$TS.json.gz
sudo -n mkdir -p "$B"
OUT=$(tool apply --expect="$SHA" --backup="$BK_IN" $ARGS); RC=$?
echo "$OUT" | sed 's/^/status: test-data-remove: /' | cut -c1-700
FILE_SHA=$(echo "$OUT" | grep '"step":"backup"' | jval file_sha256)
# a copy of the backup on the host, checked against the hash the tool reported
if $DK cp "$CT:$BK_IN" "/tmp/tdr-$TS.gz" >/dev/null 2>&1; then
  sudo -n cp -p "/tmp/tdr-$TS.gz" "$B/test-data-remove-$TS.json.gz" && sudo -n chmod 600 "$B/test-data-remove-$TS.json.gz"
  HOST_SHA=$(sudo -n sha256sum "$B/test-data-remove-$TS.json.gz" | cut -d' ' -f1); rm -f "/tmp/tdr-$TS.gz"
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
echo "$ROLL" | sed 's/^/status: test-data-remove: rollback /' | cut -c1-700
if [ $RR -eq 0 ] && [ "$(echo "$ROLL" | jval ok)" = true ]; then say "rollback complete, counts back to the backup's"; else say "ROLLBACK INCOMPLETE - needs attention (backup kept at $B/test-data-remove-$TS.json.gz)"; fi
cleanup_inputs
exit 1
