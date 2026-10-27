#!/bin/bash
# Product-content translation (owner complaint 2026-10-26: product pages with sections in mixed languages; #1978). GUARDED, three steps, one per run,
# set STEP below. It only ever fills EMPTY product texts by TRANSLATING the text that exists (never invents content); every answer is checked (same
# numbers, right script, sane length, no markup) and the result is written only by the guarded `90-catalogue-apply` run, never by this task.
# The model calls go through the gateway's fallback chain (modules/ai/env-chain.ts): every provider whose key is set in the container's
# environment (Gemini, Groq, OpenAI, DeepSeek, OpenRouter, Cerebras, OpenCode ...) is tried in priority order, a provider that is rejected,
# limited or down is parked and the next one is used. Variable NAMES are printed, never values.
#
#   STEP=gaps  (default, DRY RUN): reads the published products (read-only), counts the missing texts per language pair and field, prints the token
#              count and the price at the configured model, and writes the requests file to $W/requests.jsonl with its SHA-256. No AI call.
#              Also counts the texts in the WRONG column (an Arabic text in the English column) per field and pair: they are FIXED, not skipped
#              (owner 2026-10-27): moved to their own column when it is empty, or only the wrong column is emptied when the right one has its text,
#              or the two trade places. They are written to $W/requests.jsonl.moves.json, which STEP=plan puts into the reviewed file; the catalogue
#              apply then moves them as guarded steps (compare-and-set on the exact old text, backup, marked machine_moved). The columns they empty
#              are in the requests, translated from the corrected product. A page shows a leaflet section in its language or hides it meanwhile.
#   STEP=run   : runs every provider whose key is set AT THE SAME TIME, each within its own requests/minute, requests/day and tokens/day
#              (60% of the day: the keys also serve the live assistant); a limited provider parks itself and the others carry on. Prints
#              `status:` lines (to stderr, so the detached log shows them) every 50 answers and per-provider stats at the end. Sends at most MAX_REQUESTS not-yet-answered requests (a bounded batch keeps a free-tier day inside its limit; run again for the
#              next batch, it resumes). REQUIRES EXPECT_REQUESTS_SHA = the hash printed by the dry run (32+ hex characters), so the reviewer's
#              numbers are the requests that are sent. Answers append to $W/responses.jsonl on the host after every run.
#   STEP=plan  : checks every answer and writes $IN/product-translations.json (the optional input of 90-catalogue-apply). Prints accepted and
#              rejected counts by reason. Then run 90-catalogue-apply: its dry run prints the plan hash, the owner approves, EXPECT_PLAN_SHA applies it
#              (backup, guarded writes into EMPTY fields only, marked machine-translated, verify, rollback). After it, add `cf-purge-api` to tools/ops/RUN.
set -u
STEP="gaps"
EXPECT_REQUESTS_SHA=""
MAX_REQUESTS=300
RPM=""            # optional cap on requests/minute PER PROVIDER; empty = each provider's own limit (catalogue; TRANSLATE_LIMITS overrides)
TARGETS=""          # e.g. "ur,hi,bn,fil" to restrict the target languages; empty = all six
LIMIT=""            # cap on the number of missing texts collected by the dry run; empty = all
IN=${OPS_CATALOGUE_DIR:-/opt/nabdah/catalogue}
W=${OPS_TRANSLATE_DIR:-$IN/translate-work}
CT=${CATALOGUE_CONTAINER:-nabdah-backend}
DK="sudo -n docker"
TOOL="node dist/scripts/translate-product-content.js"
CW=/tmp/translate-work
echo "## translate-content (STEP=$STEP)"

say() { echo "status: translate-content: $*"; }
health() { $DK inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$1" 2>/dev/null; }
tool() { $DK exec "$CT" $TOOL "$@" 2>&1; }
cleanup() { $DK exec "$CT" rm -rf "$CW" >/dev/null 2>&1; }
# host <-> container copies through stdin/stdout, as 90-catalogue-apply does
put() { sudo -n cat "$1" | $DK exec -i "$CT" sh -c "cat > $2"; }
get() { $DK exec "$CT" cat "$1" 2>/dev/null | sudo -n tee "$2" >/dev/null; }

[ "$(health "$CT")" = healthy ] || { say "ABORT $CT is not healthy"; exit 1; }
$DK exec "$CT" test -f dist/scripts/translate-product-content.js || { say "ABORT the running image has no translate-product-content tool: deploy the release first"; exit 1; }
sudo -n mkdir -p "$W" && sudo -n chmod 700 "$W" || { say "ABORT cannot create $W"; exit 1; }
$DK exec "$CT" sh -c "mkdir -p $CW" || { say "ABORT cannot create the work directory in the container"; exit 1; }

case "$STEP" in
gaps)
  OPTS="--out=$CW/requests.jsonl"
  [ -n "$TARGETS" ] && OPTS="$OPTS --targets=$TARGETS"
  [ -n "$LIMIT" ] && OPTS="$OPTS --limit=$LIMIT"
  OUT=$(tool gaps $OPTS); RC=$?
  [ $RC -eq 0 ] || { say "ABORT gaps failed (exit $RC): $(echo "$OUT" | tail -1 | cut -c1-200)"; cleanup; exit 1; }
  echo "$OUT" | sed 's/^/status: translate-content: gaps /' | cut -c1-900
  get "$CW/requests.jsonl" "$W/requests.jsonl"
  get "$CW/requests.jsonl.moves.json" "$W/requests.jsonl.moves.json"
  SHA=$(sudo -n sha256sum "$W/requests.jsonl" | cut -d' ' -f1)
  N=$(sudo -n wc -l < "$W/requests.jsonl")
  # which provider variables exist in the container (names only)
  PRESENT=""
  for v in GEMINI_API_KEY GROQ_API_KEY OPENAI_API_KEY DEEPSEEK_API_KEY OPENROUTER_API_KEY CEREBRAS_API_KEY QWEN_API_KEY OPENCODE_API_KEY; do
    if $DK exec "$CT" sh -c "[ -n \"\${$v:-}\" ]"; then PRESENT="$PRESENT $v"; fi
  done
  say "providers with a key in the container:${PRESENT:- none}"
  say "dry run only: nothing was sent to a model and nothing was written to the database. requests=$N sha256=$SHA"
  say "to send: STEP=run EXPECT_REQUESTS_SHA=$SHA (owner approval first); each run sends at most MAX_REQUESTS=$MAX_REQUESTS"
  cleanup; exit 0 ;;
run)
  case "$EXPECT_REQUESTS_SHA" in ''|*[!0-9a-f]*) say "ABORT set EXPECT_REQUESTS_SHA to the hash of the dry run (hex)"; cleanup; exit 1;; esac
  [ ${#EXPECT_REQUESTS_SHA} -ge 32 ] || { say "ABORT EXPECT_REQUESTS_SHA must have at least 32 hex characters"; cleanup; exit 1; }
  sudo -n test -f "$W/requests.jsonl" || { say "ABORT no $W/requests.jsonl: run STEP=gaps first"; cleanup; exit 1; }
  SHA=$(sudo -n sha256sum "$W/requests.jsonl" | cut -d' ' -f1)
  case "$SHA" in "$EXPECT_REQUESTS_SHA"*) ;; *) say "ABORT the requests changed (expected ${EXPECT_REQUESTS_SHA:0:12}, now ${SHA:0:12}): nothing was sent, run the dry run again"; cleanup; exit 1;; esac
  put "$W/requests.jsonl" "$CW/requests.jsonl" || { say "ABORT cannot copy the requests in"; cleanup; exit 1; }
  if sudo -n test -f "$W/responses.jsonl"; then put "$W/responses.jsonl" "$CW/responses.jsonl"; else $DK exec "$CT" sh -c ": > $CW/responses.jsonl"; fi
  OUT=$($DK exec "$CT" $TOOL run --requests="$CW/requests.jsonl" --out="$CW/responses.jsonl" ${RPM:+--rpm="$RPM"} --max="$MAX_REQUESTS" 2>&2); RC=$?   # stderr stays live: the progress lines
  echo "$OUT" | sed 's/^/status: translate-content: run /' | cut -c1-600
  # the answers are kept on the host after EVERY run, whatever the result, so the next run resumes
  get "$CW/responses.jsonl" "$W/responses.jsonl" && sudo -n chmod 600 "$W/responses.jsonl"
  A=$(sudo -n wc -l < "$W/responses.jsonl")
  if [ $RC -eq 0 ]; then say "batch done; answers on the host: $A (run again until remaining=0, then STEP=plan)"
  elif [ $RC -eq 2 ]; then say "ABORT no AI provider key is set in the container: nothing was sent"
  else say "some requests failed after retries (exit $RC); answers kept ($A). Run again to retry the rest"; fi
  cleanup; exit $RC ;;
plan)
  sudo -n test -f "$W/requests.jsonl" && sudo -n test -f "$W/responses.jsonl" || { say "ABORT need $W/requests.jsonl and $W/responses.jsonl: run STEP=gaps and STEP=run first"; cleanup; exit 1; }
  put "$W/requests.jsonl" "$CW/requests.jsonl" && put "$W/responses.jsonl" "$CW/responses.jsonl" || { say "ABORT cannot copy the files in"; cleanup; exit 1; }
  # the wrong-column moves found by STEP=gaps travel with the translations (the tool reads <requests>.moves.json when it is there)
  if sudo -n test -f "$W/requests.jsonl.moves.json"; then put "$W/requests.jsonl.moves.json" "$CW/requests.jsonl.moves.json" || { say "ABORT cannot copy the moves file in"; cleanup; exit 1; }; fi
  OUT=$(tool plan --requests="$CW/requests.jsonl" --responses="$CW/responses.jsonl" --out="$CW/product-translations.json"); RC=$?
  echo "$OUT" | sed 's/^/status: translate-content: plan /' | cut -c1-900
  [ $RC -eq 0 ] || { say "ABORT plan failed (exit $RC)"; cleanup; exit 1; }
  get "$CW/product-translations.json" "$IN/product-translations.json" && sudo -n chmod 600 "$IN/product-translations.json"
  say "wrote $IN/product-translations.json (sha256 $(sudo -n sha256sum "$IN/product-translations.json" | cut -c1-12)). Next: the 90-catalogue-apply DRY RUN reads it; nothing is written to the database yet"
  cleanup; exit 0 ;;
*) say "ABORT STEP must be gaps, run or plan"; cleanup; exit 1 ;;
esac
