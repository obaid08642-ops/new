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
#                                                    $IN/test-data-remove.json  ({"profile_ids": ["<provider profile id>", ...]}: the test providers the owner approved removing
#                                                       after reading 77-test-data-find; each is deleted with its account, sessions and everything that points at it)
# After a change of medicine names, add `cf-purge-api` to tools/ops/RUN for that run so the cached product pages refresh.
#   COMPLETION=packaged (set in this file by the reviewer): plans ONLY the owner-approved catalogue completion (2026-10-29) shipped in the image, step `catalogue_completion`
#                                                    (`--only=catalogue_completion`: it reads just the lab, radiology and nursing services and their offers, so it fits in the
#                                                    worker's 640 MB; the full plan with 20,990 medicine names does not; the host input files are not used in this mode):
#                                                    approves the 7 hidden radiology scans and every real pending lab and nursing row, adds the new radiology/lab/nursing rows,
#                                                    sets the nursing booking modes; all marked reviewed_by lead-market-review-2026-10-29 and needs_clinical_review. The dry run
#                                                    prints counts per collection and compares the pending counts with the expected ones (7 / 26 / 12).
#   ONE_OFF=yes (set in this file by the reviewer): runs the tool NOT inside $CT but in a one-off `docker run --rm` of $CT's image, on $CT's network, with the same env file
#                                                    (plus MONGO_URL/DB_NAME built from it in a mode-600 temp file, removed at the end), `--memory 900m --memory-swap 900m
#                                                    --oom-score-adj 1000` (if the host runs short, this container is the one the kernel kills), NODE_OPTIONS heap 700 MB.
#                                                    For heavy steps; never in the API container. $B is mounted as /backup (the backup file lands there directly), $IN as /in (read-only).
set -u
EXPECT_PLAN_SHA=""
COMPLETION="packaged"
ONE_OFF=""
D=${OPS_DEPLOY_DIR:-/opt/nabdah/deploy}
B=${OPS_BACKUP_DIR:-/opt/nabdah/backups}
IN=${OPS_CATALOGUE_DIR:-/opt/nabdah/catalogue}
CT=${CATALOGUE_CONTAINER:-nabdah-worker}
ENVF=$D/.env.production
TS=$(date -u +%Y%m%dT%H%M%SZ)
DK="sudo -n docker"
TOOL="node dist/scripts/catalogue-apply.js"
echo "## catalogue-apply"

say() { echo "status: catalogue-apply: $*"; }
health() { $DK inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$1" 2>/dev/null; }
# the value of a top-level JSON key from one line of the tool's output (numbers, hashes and booleans only)
jval() { sed -n "s/.*\"$1\":\([^,}]*\).*/\1/p" | head -1 | tr -d '"'; }
# the first output line of the tool that mentions \$1
tool() {
  if [ -n "$ONE_OFF" ]; then
    $DK run --rm --user 0:0 --memory 900m --memory-swap 900m --oom-score-adj 1000 --network "$ONE_OFF_NET" --env-file "$ENVF" --env-file "$ONE_OFF_ENV" \
      -e NODE_OPTIONS=--max-old-space-size=700 -v "$B:/backup" -v "$IN:/in:ro" "$ONE_OFF_IMG" $TOOL "$@" 2>&1
  else
    $DK exec "$CT" $TOOL "$@" 2>&1
  fi
}
envval() { sudo -n sed -n "s/^$1=//p" "$ENVF" 2>/dev/null | tail -1 | tr -d "\"'"; }
ONE_OFF_ENV=""
one_off_cleanup() { [ -n "$ONE_OFF_ENV" ] && sudo -n rm -f "$ONE_OFF_ENV"; ONE_OFF_ENV=""; }

# --- 0. pre-checks
[ "$(health "$CT")" = healthy ] || { say "ABORT $CT is not healthy"; exit 1; }
$DK exec "$CT" test -f dist/scripts/catalogue-apply.js || { say "ABORT the running image has no catalogue-apply tool: deploy the release first"; exit 1; }
if [ -n "$ONE_OFF" ]; then
  ONE_OFF_IMG=$($DK inspect -f '{{.Config.Image}}' "$CT" 2>/dev/null)
  ONE_OFF_NET=$($DK inspect -f '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}' "$CT" 2>/dev/null | awk '{print $1}')
  [ -n "$ONE_OFF_IMG" ] && [ -n "$ONE_OFF_NET" ] || { say "ABORT cannot read the image or network of $CT"; exit 1; }
  sudo -n test -r "$ENVF" || { say "ABORT $ENVF is not readable"; exit 1; }
  ONE_OFF_ENV=$(sudo -n mktemp) && sudo -n chmod 600 "$ONE_OFF_ENV" \
    && printf 'MONGO_URL=mongodb://%s:%s@mongodb:27017/?authSource=admin\nDB_NAME=%s\n' "$(envval MONGO_ROOT_USER)" "$(envval MONGO_ROOT_PASSWORD)" "$(envval DB_NAME | grep . || echo nabd_nestjs)" | sudo -n tee "$ONE_OFF_ENV" >/dev/null \
    || { say "ABORT cannot write the temp env file"; one_off_cleanup; exit 1; }
  say "one-off container: image of $CT, network $ONE_OFF_NET, 900m memory, no swap, oom_score_adj 1000 (the tool does not run inside $CT)"
fi
ARGS=""
if [ "$COMPLETION" = packaged ]; then
  ARGS="$ARGS --only=catalogue_completion --catalogue-completion=packaged"; say "catalogue completion (packaged) planned on its own (--only=catalogue_completion)"
fi
if [ "$COMPLETION" = packaged ]; then :   # --only: the other inputs are not used
elif [ -n "$ONE_OFF" ]; then
  # the host files are mounted read-only at /in: no copy into a container
  for f in districts.json:districts approved-name-fixes.csv:name-fixes product-translations.json:product-translations radiology-approve.json:radiology-approve test-data-remove.json:test-data-remove; do
    sudo -n test -f "$IN/${f%%:*}" && ARGS="$ARGS --${f##*:}=/in/${f%%:*}" && say "input ${f%%:*} used from $IN"
  done
else
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
if sudo -n test -f "$IN/test-data-remove.json"; then
  sudo -n cat "$IN/test-data-remove.json" | $DK exec -i "$CT" sh -c 'cat > /tmp/cat-test-data-remove.json' && ARGS="$ARGS --test-data-remove=/tmp/cat-test-data-remove.json" && say "input test-data-remove.json copied in"
fi
fi
cleanup_inputs() { one_off_cleanup; [ -n "$ONE_OFF" ] && return 0; $DK exec "$CT" sh -c 'rm -f /tmp/cat-districts.json /tmp/cat-name-fixes.csv /tmp/cat-product-translations.json /tmp/cat-radiology-approve.json /tmp/cat-test-data-remove.json' >/dev/null 2>&1; }

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
[ -n "$ONE_OFF" ] && BK_IN=/backup/catalogue-$TS.json.gz   # the one-off container writes straight into $B
sudo -n mkdir -p "$B"
OUT=$(tool apply --expect="$SHA" --backup="$BK_IN" $ARGS); RC=$?
echo "$OUT" | sed 's/^/status: catalogue-apply: /' | cut -c1-700
FILE_SHA=$(echo "$OUT" | grep '"step":"backup"' | jval file_sha256)
# a copy of the backup on the host, checked against the hash the tool reported
if [ -n "$ONE_OFF" ] && sudo -n test -f "$B/catalogue-$TS.json.gz" || $DK cp "$CT:$BK_IN" "/tmp/cat-$TS.gz" >/dev/null 2>&1; then
  [ -z "$ONE_OFF" ] && sudo -n cp -p "/tmp/cat-$TS.gz" "$B/catalogue-$TS.json.gz"
  sudo -n chmod 600 "$B/catalogue-$TS.json.gz"
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
