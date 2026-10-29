# Sourced by tools/ops/cf/4x-*.sh after _auth.sh. The cache-rules phase of the zone, edited one named rule at a time, with a way back.
#   rules_load                    reads the phase; sets RID (ruleset id), OLD (rules as a JSON array); prints ids and on/off only
#   rules_want <desc> <expr> <params-json>   queues a rule; an existing rule of that name must be equal (else the task stops: not touched)
#   rules_commit                  APPLY=1: PUTs OLD + the missing rules (new rules go last: the last match wins); prints the new ids
#   rules_rollback <reason>       puts OLD back (only if this run changed something) and exits 1
# Env: Z, CF_API, APPLY, TAG (log prefix, e.g. "public-html"). Lines are "cf: <TAG> ..." and never carry rule text or values.
PHASE="http_request_cache_settings"
CF_API=${CF_API:-https://api.cloudflare.com/client/v4}
APPLY=${APPLY:-0}
WANT='[]'
CHANGED=0
rsay() { echo "cf: $TAG $*"; }
rules_load() {
  local cur
  cur=$(cf_curl "$CF_API/zones/$Z/rulesets/phases/$PHASE/entrypoint")
  [ "$(echo "$cur" | jq -r .success)" = true ] || { rsay "BLOCKED cannot read the cache rules: $(echo "$cur" | jq -c '[.errors[]?.message]')"; exit 1; }
  RID=$(echo "$cur" | jq -r .result.id)
  rsay "cache rules now: $(echo "$cur" | jq -r '.result.rules | length') ($(echo "$cur" | jq -r '[.result.rules[] | select(.enabled)] | length') enabled)"
  echo "$cur" | jq -r '.result.rules[] | "cf: '"$TAG"'   rule id \(.id) \(if .enabled then "on" else "off" end)"'
  OLD=$(echo "$cur" | jq -c '[.result.rules[] | {id, action, action_parameters, expression, description, enabled}]')
}
rules_want() {
  local desc=$1 expr=$2 params=$3
  if [ "$(echo "$OLD" | jq --arg d "$desc" '[.[] | select(.description == $d)] | length')" != 0 ]; then
    echo "$OLD" | jq -e --arg d "$desc" --arg e "$expr" --argjson p "$params" '.[] | select(.description == $d) | .enabled == true and .expression == $e and .action_parameters == $p' >/dev/null \
      && { rsay "rule already there and correct, id $(echo "$OLD" | jq -r --arg d "$desc" '.[] | select(.description == $d) | .id')"; return 0; } \
      || { rsay "a rule named like this exists but differs: not touching it"; exit 1; }
  fi
  WANT=$(echo "$WANT" | jq -c --arg d "$desc" --arg e "$expr" --argjson p "$params" '. + [{action: "set_cache_settings", description: $d, enabled: true, expression: $e, action_parameters: $p}]')
}
rules_put() { cf_curl -X PUT -H 'Content-Type: application/json' "$CF_API/zones/$Z/rulesets/$RID" --data "$(jq -nc --argjson r "$1" '{rules: $r}')"; }
rules_commit() {
  [ "$(echo "$WANT" | jq 'length')" != 0 ] || return 0
  [ "$APPLY" = 1 ] || { rsay "would add $(echo "$WANT" | jq 'length') rule(s) at the end (after the bypass rules); run the -apply task to change it"; exit 0; }
  local r; r=$(rules_put "$(jq -nc --argjson o "$OLD" --argjson w "$WANT" '$o + $w')")
  [ "$(echo "$r" | jq -r .success)" = true ] || { rsay "FAILED to add the rule(s): $(echo "$r" | jq -c '[.errors[]?.message]'): nothing changed"; exit 1; }
  CHANGED=1
  rsay "added, ids: $(echo "$r" | jq -r --argjson w "$WANT" '[.result.rules[] | select(.description as $d | $w | map(.description) | index($d)) | .id] | join(" ")') (cache rules now $(echo "$r" | jq -r '.result.rules | length'))"
}
rules_rollback() {
  rsay "CHECK FAILED ($1): putting the previous rules back"
  [ "$CHANGED" = 1 ] && rules_put "$OLD" | jq -r '"cf: '"$TAG"' rollback success=\(.success)"'
  exit 1
}
# helpers for the checks
hdr() { curl -s -o /dev/null -D - --max-time 25 "$@" | tr -d '\r'; }
h() { awk -F': ' -v k="$1" 'tolower($1)==k{sub(/^[^:]*: /,""); print; exit}'; }
# hit_ratio <n> <curl args...>: how many of n repeated requests were served from the cache (cf-cache-status HIT)
hit_ratio() { local n=$1; shift; local hits=0 i s; for i in $(seq "$n"); do s=$(hdr "$@" | h cf-cache-status); [ "$s" = HIT ] && hits=$((hits + 1)); done; echo "$hits/$n"; }
