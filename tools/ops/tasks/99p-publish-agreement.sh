#!/bin/bash
# Publishes the provider agreement (legal_policies key `provider_agreement`) right after a deploy. Registration submit and the signed contract PDF need it published
# (`provider_agreement_not_published` otherwise), so this runs in the same run as the deploy that ships #2364. Two runs of the same task:
#   Run 1 (APPLY empty): DRY RUN. Checks the texts and the published state, writes nothing.
#   Run 2 (APPLY=yes, set in this file by the reviewer after reading run 1): publishes, then runs the tool once more to prove the published row equals the texts ("verified").
# How it runs: the COMPILED tool `node dist/scripts/publish-provider-agreement.js` (the image must hold it: `nest build` compiles src/scripts) in a ONE-OFF container of $CT's image,
# on $CT's network, with the same env file, MONGO_URL / DB_NAME built from it in a mode-600 temp file (as 90-catalogue-apply does), `--memory 300m --memory-swap 300m --oom-score-adj 1000`
# (if the host runs short, this is the container the kernel kills).
# The two texts (docs/legal/03_PROVIDER_AGREEMENT.ar.md and .en.md) come from the newest uploaded release (REL/<sha>/deploy.tgz, after `sha256sum -c SHA256SUMS`): looked up as
# docs/legal/<file> and, failing that, deploy/legal/<file>. They are extracted to a temp directory and mounted READ-ONLY at /legal (LEGAL_DOCS_DIR). If the release holds neither, the task
# ABORTS with that message: the release bundle must carry the two files (the release pipeline is not in this repository).
# REQUIRE_ACCEPTANCE="no" (default here): providers are NOT locked out of /provider/ routes (the provider app build with the contract gate is not in the stores yet); new registrations still
#   accept the agreement before they submit. Set it to "yes" in this file when that build is out and every provider should accept the published version.
# What the tool does with APPLY: backs up the existing provider_agreement row and the draft row to legal_policy_backups, writes the row (PUBLISHED, effective date = now) and the immutable
# snapshot, retires provider_agreement_draft; it refuses a text with "draft" or a blank bracket and a version that is not higher than the published one. Nothing is deleted without a backup.
# Prints `status:` lines only: version, the first 12 characters of the hashes of the texts, the backup row ids, published yes/no. Never a text, a URI or a value of the environment.
set -u
APPLY=""
REQUIRE_ACCEPTANCE="no"
CT=${PUBLISH_AGREEMENT_CONTAINER:-nabdah-backend}
D=${OPS_DEPLOY_DIR:-/opt/nabdah/deploy}
REL_ROOT=${OPS_RELEASE_DIR:-/opt/nabdah/releases}
ENVF=$D/.env.production
DK="sudo -n docker"
TOOL="node dist/scripts/publish-provider-agreement.js"
FILES="03_PROVIDER_AGREEMENT.ar.md 03_PROVIDER_AGREEMENT.en.md"
echo "## publish-agreement"

say() { echo "status: publish-agreement: $*"; }
health() { $DK inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$1" 2>/dev/null; }
# the value of a top-level key from the tool's JSON line (strings, numbers, booleans); arrays are read by jarr
jval() { sed -n "s/.*\"$1\":\"\{0,1\}\([^,}\"]*\)\"\{0,1\}.*/\1/p" | head -1; }
jarr() { sed -n "s/.*\"$1\":\[\([^]]*\)\].*/\1/p" | head -1 | tr -d '"'; }
envval() { sudo -n sed -n "s/^$1=//p" "$ENVF" 2>/dev/null | tail -1 | tr -d "\"'"; }

STAGE=""; ONE_OFF_ENV=""
cleanup() { [ -n "$STAGE" ] && sudo -n rm -rf "$STAGE"; [ -n "$ONE_OFF_ENV" ] && sudo -n rm -f "$ONE_OFF_ENV"; STAGE=""; ONE_OFF_ENV=""; }
trap cleanup EXIT

# --- 0. pre-checks
[ "$(health "$CT")" = healthy ] || { say "ABORT $CT is not healthy"; exit 1; }
$DK exec "$CT" test -f dist/scripts/publish-provider-agreement.js || { say "ABORT the running image has no publish-provider-agreement tool: deploy the release first"; exit 1; }
IMG=$($DK inspect -f '{{.Config.Image}}' "$CT" 2>/dev/null)
NET=$($DK inspect -f '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}' "$CT" 2>/dev/null | awk '{print $1}')
[ -n "$IMG" ] && [ -n "$NET" ] || { say "ABORT cannot read the image or network of $CT"; exit 1; }
sudo -n test -r "$ENVF" || { say "ABORT $ENVF is not readable"; exit 1; }

# --- 1. the texts: newest uploaded release with a checksummed deploy.tgz
REL=""
for d in $(sudo -n ls -1t "$REL_ROOT" 2>/dev/null); do
  sudo -n test -f "$REL_ROOT/$d/deploy.tgz" && sudo -n test -f "$REL_ROOT/$d/SHA256SUMS" && { REL="$REL_ROOT/$d"; break; }
done
[ -n "$REL" ] || { say "ABORT no uploaded release ($REL_ROOT/<sha>/deploy.tgz with SHA256SUMS)"; exit 1; }
sudo -n sh -c "cd '$REL' && sha256sum -c --quiet SHA256SUMS" >/dev/null 2>&1 || { say "ABORT the release checksum does not match (SHA256SUMS)"; exit 1; }
STAGE=$(sudo -n mktemp -d) || { say "ABORT cannot create a temp directory"; exit 1; }
sudo -n mkdir -p "$STAGE/legal" "$STAGE/x" && sudo -n chmod 755 "$STAGE" "$STAGE/legal"
for f in $FILES; do
  for p in "docs/legal/$f" "deploy/legal/$f"; do
    sudo -n tar -xzf "$REL/deploy.tgz" -C "$STAGE/x" "$p" 2>/dev/null && sudo -n test -s "$STAGE/x/$p" && { sudo -n cp "$STAGE/x/$p" "$STAGE/legal/$f"; break; }
  done
  sudo -n test -s "$STAGE/legal/$f" || { say "ABORT the release $(basename "$REL") does not hold docs/legal/$f (nor deploy/legal/$f): add the two files to the release bundle"; exit 1; }
  sudo -n chmod 644 "$STAGE/legal/$f"
done
say "texts from release $(basename "$REL"): ar sha256=$(sudo -n sha256sum "$STAGE/legal/03_PROVIDER_AGREEMENT.ar.md" | cut -c1-12) en sha256=$(sudo -n sha256sum "$STAGE/legal/03_PROVIDER_AGREEMENT.en.md" | cut -c1-12)"

# --- 2. env for the one-off container (MONGO_URL / DB_NAME as 90-catalogue-apply builds them)
ONE_OFF_ENV=$(sudo -n mktemp) && sudo -n chmod 600 "$ONE_OFF_ENV" \
  && printf 'MONGO_URL=mongodb://%s:%s@mongodb:27017/?authSource=admin\nDB_NAME=%s\n' "$(envval MONGO_ROOT_USER)" "$(envval MONGO_ROOT_PASSWORD)" "$(envval DB_NAME | grep . || echo nabd_nestjs)" | sudo -n tee "$ONE_OFF_ENV" >/dev/null \
  || { say "ABORT cannot write the temp env file"; exit 1; }
case "$REQUIRE_ACCEPTANCE" in yes|no) ;; *) say "ABORT REQUIRE_ACCEPTANCE must be yes or no"; exit 1;; esac

run_tool() { # $1 = APPLY value (yes|no)
  $DK run --rm --user 0:0 --memory 300m --memory-swap 300m --oom-score-adj 1000 --network "$NET" --env-file "$ENVF" --env-file "$ONE_OFF_ENV" \
    -e NODE_OPTIONS=--max-old-space-size=200 -e LEGAL_DOCS_DIR=/legal -e APPLY="$1" -e REQUIRE_ACCEPTANCE="$REQUIRE_ACCEPTANCE" -v "$STAGE/legal:/legal:ro" "$IMG" $TOOL 2>&1
}
report() { # $1 = tool output; prints status lines from its JSON line only
  local j; j=$(echo "$1" | grep '"step":"publish"' | head -1)
  say "version $(echo "$j" | jval version): $(echo "$j" | jval result); hashes ar=$(echo "$j" | jval sha_ar) en=$(echo "$j" | jval sha_en)"
  say "published row before: $(echo "$j" | jval previous_version | grep . || echo none); backup row ids: $(echo "$j" | jarr backup_ids | grep . || echo none); draft row retired: $(echo "$j" | jval draft_retired); acceptance required: $(echo "$j" | jval acceptance_required)"
}

# --- 3. plan (read-only)
OUT=$(run_tool no); RC=$?
if [ $RC -ne 0 ] || ! echo "$OUT" | grep -q '"step":"publish"'; then say "ABORT the tool refused or failed (exit $RC): $(echo "$OUT" | tail -1 | cut -c1-200)"; exit 1; fi
report "$OUT"
if [ "$APPLY" != yes ]; then
  say "published: no. Dry run only: nothing was written. To publish, set APPLY=yes in this task (REQUIRE_ACCEPTANCE is $REQUIRE_ACCEPTANCE)"
  exit 0
fi

# --- 4. publish, then prove it
OUT=$(run_tool yes); RC=$?
if [ $RC -ne 0 ] || ! echo "$OUT" | grep -q '"step":"publish"'; then say "FAILED (exit $RC), published: no. $(echo "$OUT" | tail -1 | cut -c1-200). The tool backs up before it writes; run the dry run to see the state"; exit 1; fi
report "$OUT"
echo "$OUT" | grep '"step":"publish"' | grep -q '"published":true' || { say "published: no (result was not 'published')"; exit 1; }
CHECK=$(run_tool no); CRC=$?
if [ $CRC -eq 0 ] && echo "$CHECK" | grep '"step":"publish"' | grep -q '"result":"unchanged"'; then
  say "verified: the published row equals the texts of release $(basename "$REL"). published: yes"
else
  say "published: yes, but the verification run did not report 'unchanged' (exit $CRC): $(echo "$CHECK" | tail -1 | cut -c1-200)"; exit 1
fi
