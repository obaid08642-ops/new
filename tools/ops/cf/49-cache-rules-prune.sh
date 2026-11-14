#!/bin/bash
# The free plan allows 10 rules in the cache phase; cf:47 failed with "12 out of 10" (2026-10-28) because 5 old DISABLED rules still count. This task deletes
# only DISABLED rules that are older than the cutoff (default: the oldest enabled rule of the public-cache tasks 45/46/47, found by its description; a
# disabled rule never matches traffic, so removing it changes nothing at the edge). An ENABLED rule is never touched: not deleted, not edited, not reordered.
# Prints ids, on/off and last_updated only; never rule text.
#   49-cache-rules-prune-check.sh   reads only      49-cache-rules-prune-apply.sh   APPLY=1: deletes (at most MAX_DELETE, oldest first), then re-reads and proves
#                                                   every enabled rule is byte-for-byte what it was
# Env: CF/CFE/Z (_auth.sh), APPLY, CF_API, WANT_NEW (rules cf:47 will add; default 2), LIMIT (default 10), MAX_DELETE (default 5), PRUNE_BEFORE (ISO time; default: the
# oldest last_updated of an enabled rule whose description starts with "Public" or "Images"), PRUNE_IDS (optional: space separated id prefixes; only these, still only if off and older).
set -uo pipefail
HERE=$(dirname "$0")
. "$HERE/_auth.sh"
TAG=cache-prune
. "$HERE/_rules.sh"
WANT_NEW=${WANT_NEW:-2}; LIMIT=${LIMIT:-10}; MAX_DELETE=${MAX_DELETE:-5}
say() { rsay "$@"; }

cur=$(cf_curl "$CF_API/zones/$Z/rulesets/phases/$PHASE/entrypoint")
[ "$(echo "$cur" | jq -r .success)" = true ] || { say "BLOCKED cannot read the cache rules: $(echo "$cur" | jq -c '[.errors[]?.message]')"; exit 1; }
RID=$(echo "$cur" | jq -r .result.id)
TOTAL=$(echo "$cur" | jq '.result.rules | length'); ON=$(echo "$cur" | jq '[.result.rules[] | select(.enabled)] | length')
say "cache rules now: $TOTAL ($ON enabled), plan limit $LIMIT, the next task adds $WANT_NEW"
echo "$cur" | jq -r '.result.rules[] | "cf: '"$TAG"'   rule id \(.id) \(if .enabled then "on" else "off" end) last_updated \(.last_updated // "unknown")"'

CUT=${PRUNE_BEFORE:-$(echo "$cur" | jq -r '[.result.rules[] | select(.enabled and ((.description // "") | test("^(Public|Images)"))) | .last_updated // empty] | min // empty')}
if [ -z "$CUT" ]; then say "BLOCKED no cutoff: no enabled rule of the public-cache tasks to compare with (set PRUNE_BEFORE): nothing changed"; exit 1; fi
say "cutoff: only disabled rules last updated before $CUT"
PIDS=${PRUNE_IDS:-}
CAND=$(echo "$cur" | jq -r --arg cut "$CUT" --arg pids "$PIDS" '
  [.result.rules[] | select((.enabled | not) and (.last_updated != null) and (.last_updated < $cut)
     and ($pids == "" or (.id as $i | ($pids | split(" ") | map(select(. != "")) | any(. as $p | $i | startswith($p))))))]
  | sort_by(.last_updated) | .[].id')
N=$(echo "$CAND" | grep -c . || true)
NEED=$(( TOTAL + WANT_NEW - LIMIT )); [ "$NEED" -lt 0 ] && NEED=0
say "candidates (off, older): $N; to free for the next task: $NEED; deleting at most $MAX_DELETE"
for id in $CAND; do say "  candidate $id"; done
if [ "$N" -lt "$NEED" ]; then say "BLOCKED not enough old disabled rules ($N) to fit $WANT_NEW new ones under $LIMIT (need to free $NEED): nothing changed. Merge the cf:47 expressions into one rule instead"; exit 1; fi
[ "$NEED" -gt 0 ] || { say "nothing to free: $TOTAL + $WANT_NEW fits in $LIMIT"; exit 0; }
DEL=$(echo "$CAND" | head -n "$(( NEED > MAX_DELETE ? MAX_DELETE : NEED ))" | tr '\n' ' ')
[ "$APPLY" = 1 ] || { say "would delete: ${DEL:-none}(only these, oldest first); run the -apply task to change it"; exit 0; }

KEEP=$(echo "$cur" | jq -c --arg del "$DEL" '[.result.rules[] | select(.id as $i | ($del | split(" ") | index($i)) | not) | {id, action, action_parameters, expression, description, enabled}]')
BEFORE_ON=$(echo "$cur" | jq -cS '[.result.rules[] | select(.enabled) | {id, action, action_parameters, expression, description, enabled}]')
r=$(rules_put "$KEEP")
[ "$(echo "$r" | jq -r .success)" = true ] || { say "FAILED to delete: $(echo "$r" | jq -c '[.errors[]?.message]'): nothing changed"; exit 1; }
AFTER=$(cf_curl "$CF_API/zones/$Z/rulesets/phases/$PHASE/entrypoint")
AFTER_ON=$(echo "$AFTER" | jq -cS '[.result.rules[] | select(.enabled) | {id, action, action_parameters, expression, description, enabled}]')
say "deleted: ${DEL}; cache rules now $(echo "$AFTER" | jq '.result.rules | length')"
if [ "$BEFORE_ON" != "$AFTER_ON" ]; then
  say "CHECK FAILED an enabled rule differs after the delete: putting the previous rules back"
  rules_put "$(echo "$cur" | jq -c '[.result.rules[] | {id, action, action_parameters, expression, description, enabled}]')" | jq -r '"cf: '"$TAG"' rollback success=\(.success)"'
  exit 1
fi
say "OK enabled rules unchanged ($(echo "$AFTER_ON" | jq length)); room for $(( LIMIT - $(echo "$AFTER" | jq '.result.rules | length') )) more rule(s)"
