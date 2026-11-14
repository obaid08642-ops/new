#!/bin/bash
# READ-ONLY. Finds test and seed records in production (owner decision 2026-10-28: "remove the test providers") and says what each provider record is
# linked to. Runs `node dist/scripts/test-data-find.js` INSIDE the backend container (its own MONGO_URL / DB_NAME, no admin token on the wire):
#   - names that match test, sandbox, demo, dummy, fake, lorem, اختبار, تجرب, or look like keyboard mash, in the provider, account, facility and
#     catalogue collections (provider_profiles, doctors, facilities, provider_accounts, users, medicines, lab/radiology/nursing services, specialties,
#     insurance companies), plus the three providers the owner named (ids starting 7210a983, c142700b, f3dee443);
#   - for each provider record, how many documents of which collection point at it: orders, bookings, reviews, files, sessions, requests...
# It prints counts, ids and the matched pattern name as `status:` lines. NEVER a name, an e-mail, a phone number, a document or a value of the environment.
# Optional: IDS="id1,id2" (set in this file) to add provider profile ids to look at. Writes nothing.
# The removal is a step of 90-catalogue-apply (reviewed file test-data-remove.json: dry run, plan hash, owner approval, backup, verify, rollback).
set -u
IDS=""
CT=${TEST_DATA_CONTAINER:-nabdah-backend}
DK="sudo -n docker"
TOOL="node dist/scripts/test-data-find.js"
echo "## test-data-find"
say() { echo "status: test-data-find: $*"; }
health() { $DK inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$1" 2>/dev/null; }

STATE=$(health "$CT")
[ "$STATE" = healthy ] || { say "ABORT $CT is not healthy ($STATE)"; exit 1; }
$DK exec "$CT" test -f dist/scripts/test-data-find.js || { say "ABORT the running image has no test-data-find tool: deploy the release first"; exit 1; }
OUT=$($DK exec "$CT" $TOOL ${IDS:+--ids="$IDS"} 2>&1); RC=$?
if [ $RC -ne 0 ]; then say "FAILED (exit $RC): $(echo "$OUT" | tail -1 | cut -c1-200)"; exit 1; fi
# only the tool's own JSON lines are shown (a stray line of any other kind is dropped)
echo "$OUT" | grep '^{"step":"' | sed 's/^/status: test-data-find: /' | cut -c1-400
say "done: read only, nothing was written"
exit 0
