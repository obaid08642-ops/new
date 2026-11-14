#!/bin/bash
# Removal of the legacy withdrawal rows (collection `withdrawalrequests`, owner decision 2026-10-31: nothing creates them any more, there are no real users,
# so they are deleted and not archived). The routes that paid them are gone from the backend. Runs `node dist/scripts/legacy-withdrawals-remove.js` INSIDE
# the backend container (its own MONGO_URL / DB_NAME).
#   Run 1 (EXPECT_PLAN_SHA empty): DRY RUN. Prints the number of rows, their ids and the plan's SHA-256 as `status:` lines. Nothing is written.
#   Run 2 (EXPECT_PLAN_SHA = the hash of run 1, set in this file by the reviewer after the counts were read): backup of every row that will be deleted (read back
#          and hashed; a copy on the host), deletion by exact _id only, a fresh plan must be EMPTY; any mismatch rolls back from the backup.
# Never prints a name, an IBAN or an amount.
set -u
EXPECT_PLAN_SHA=""
B=${OPS_BACKUP_DIR:-/opt/nabdah/backups}
CT=${LEGACY_WITHDRAWALS_CONTAINER:-nabdah-backend}
TS=$(date -u +%Y%m%dT%H%M%SZ)
DK="sudo -n docker"
TOOL="node dist/scripts/legacy-withdrawals-remove.js"
echo "## legacy-withdrawals-remove"

say() { echo "status: legacy-withdrawals-remove: $*"; }
health() { $DK inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$1" 2>/dev/null; }
# the value of a top-level JSON key from one line of the tool's output (numbers, hashes and booleans only)
jval() { sed -n "s/.*\"$1\":\([^,}]*\).*/\1/p" | head -1 | tr -d '"'; }
tool() { $DK exec "$CT" $TOOL "$@" 2>&1; }

# --- 0. pre-checks
[ "$(health "$CT")" = healthy ] || { say "ABORT $CT is not healthy"; exit 1; }
$DK exec "$CT" test -f dist/scripts/legacy-withdrawals-remove.js || { say "ABORT the running image has no legacy-withdrawals-remove tool: deploy the release first"; exit 1; }

# --- 1. plan
PLAN=$(tool plan); RC=$?
[ $RC -eq 0 ] || { say "ABORT plan failed (exit $RC): $(echo "$PLAN" | tail -1 | cut -c1-200)"; exit 1; }
SHA=$(echo "$PLAN" | jval plan_sha)
TOTAL=$(echo "$PLAN" | jval total_changes)
say "plan sha=$SHA total_changes=$TOTAL"
echo "$PLAN" | sed 's/^/status: legacy-withdrawals-remove: plan /' | cut -c1-900
if [ -z "$EXPECT_PLAN_SHA" ]; then
  say "dry run only: nothing was written. To apply, set EXPECT_PLAN_SHA=$SHA in this task (review first)"
  exit 0
fi
case "$EXPECT_PLAN_SHA" in *[!0-9a-f]*) say "ABORT EXPECT_PLAN_SHA is not hex"; exit 1;; esac
[ ${#EXPECT_PLAN_SHA} -ge 32 ] || { say "ABORT EXPECT_PLAN_SHA must have at least 32 hex characters"; exit 1; }
case "$SHA" in "$EXPECT_PLAN_SHA"*) ;; *) say "ABORT the plan changed (expected ${EXPECT_PLAN_SHA:0:12}, now ${SHA:0:12}): nothing was written, run the dry run again"; exit 1;; esac
[ "$TOTAL" != 0 ] || { say "nothing to apply (no legacy rows)"; exit 0; }

# --- 2+3. backup, apply, verify
BK_IN=/tmp/legacy-withdrawals-backup-$TS.json.gz
sudo -n mkdir -p "$B"
OUT=$(tool apply --expect="$SHA" --backup="$BK_IN"); RC=$?
echo "$OUT" | sed 's/^/status: legacy-withdrawals-remove: /' | cut -c1-700
FILE_SHA=$(echo "$OUT" | grep '"step":"backup"' | jval file_sha256)
# a copy of the backup on the host, checked against the hash the tool reported
if $DK cp "$CT:$BK_IN" "/tmp/lwr-$TS.gz" >/dev/null 2>&1; then
  sudo -n cp -p "/tmp/lwr-$TS.gz" "$B/legacy-withdrawals-$TS.json.gz" && sudo -n chmod 600 "$B/legacy-withdrawals-$TS.json.gz"
  HOST_SHA=$(sudo -n sha256sum "$B/legacy-withdrawals-$TS.json.gz" | cut -d' ' -f1); rm -f "/tmp/lwr-$TS.gz"
  if [ -n "$FILE_SHA" ] && [ "$HOST_SHA" = "$FILE_SHA" ]; then say "backup saved (sha256 ${HOST_SHA:0:12})"; else say "WARNING host backup hash differs from the tool's"; fi
fi
if [ $RC -eq 0 ]; then say "applied and verified (no legacy rows remain)"; exit 0; fi

# --- 4. rollback
if [ $RC -eq 2 ]; then say "plan changed between the checks: nothing was written"; exit 1; fi
say "FAILED (exit $RC), rolling back from the backup"
ROLL=$(tool rollback --backup="$BK_IN"); RR=$?
echo "$ROLL" | sed 's/^/status: legacy-withdrawals-remove: rollback /' | cut -c1-700
if [ $RR -eq 0 ] && [ "$(echo "$ROLL" | jval ok)" = true ]; then say "rollback complete, the rows are back"; else say "ROLLBACK INCOMPLETE - needs attention (backup kept at $B/legacy-withdrawals-$TS.json.gz)"; fi
exit 1
