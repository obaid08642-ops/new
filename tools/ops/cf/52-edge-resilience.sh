#!/bin/bash
# Public pages must open from the edge while the origin is down (owner, 2026-11-02: production unreachable, Cloudflare 522 in every region).
# The cache rules of 46/47 already let the edge keep the last good copy (`stale-if-error=31536000`), but each Cloudflare data centre kept its own
# copy and a quiet data centre had none, so it went to the dead origin. Three zone settings, each applied on its own:
#   tiered   Smart Tiered Cache: a lower data centre asks an upper tier before the origin, so one warm upper-tier copy serves them all, stale
#            included, when the origin is unreachable (cache/tiered_cache_smart_topology_enable). Free.
#   reserve  Cache Reserve: persistent storage behind the cache, so a copy is not evicted for lack of traffic (cache/cache_reserve). A paid
#            add-on; it only keeps objects whose freshness lifetime is 10 hours or more, so it helps the long-lived answers (images, catalogue
#            pictures), not the 60 s home page. A zone without it is told so and the other two are still applied.
#   always  Always Online (settings/always_online): the last resort for a path nothing else holds. Plan dependent.
#   52-edge-resilience-check.sh   reads only: each setting now and what would change
#   52-edge-resilience-apply.sh   APPLY=1: turns each on, reads it back, puts the old value back when the read-back disagrees
# Env: CF/CFE/Z (_auth.sh), APPLY, CF_API, SETTINGS (default "tiered reserve always").
set -uo pipefail
HERE=$(dirname "$0")
. "$HERE/_auth.sh"
TAG=edge-resilience
CF_API=${CF_API:-https://api.cloudflare.com/client/v4}
APPLY=${APPLY:-0}
SETTINGS=${SETTINGS:-tiered reserve always}
say() { echo "cf: $TAG $*"; }

path_of() { case "$1" in
  tiered) echo cache/tiered_cache_smart_topology_enable ;;
  reserve) echo cache/cache_reserve ;;
  always) echo settings/always_online ;;
  *) return 1 ;; esac; }

# value_of <setting>: on | off | unknown (the API refused or the zone has no such setting)
value_of() {
  cf_curl "$CF_API/zones/$Z/$(path_of "$1")" | jq -r 'if .success then (.result.value // "unknown") else "unknown" end' 2>/dev/null || echo unknown
}
# set_to <setting> <on|off>: prints success|<first error message>
set_to() {
  cf_curl -X PATCH -H 'Content-Type: application/json' --data "{\"value\":\"$2\"}" "$CF_API/zones/$Z/$(path_of "$1")" \
    | jq -r 'if .success then "success" else ([.errors[]?.message] | first // "refused") end' 2>/dev/null || echo refused
}

say "credential: $(cf_verify)"
RC=0
for s in $SETTINGS; do
  path_of "$s" >/dev/null || { say "ABORT unknown setting $s"; exit 1; }
  before=$(value_of "$s")
  say "$s now: $before"
  if [ "$before" = on ]; then say "$s already on"; continue; fi
  if [ "$APPLY" != 1 ]; then say "$s would be set to on (run the -apply task)"; continue; fi
  r=$(set_to "$s" on)
  if [ "$r" != success ]; then say "NOTE $s not changed: ${r:0:160} (the plan may not include it); the others are still applied"; continue; fi
  sleep 2
  after=$(value_of "$s")
  if [ "$after" = on ]; then say "$s is on"
  else
    say "FAIL $s reads back as $after after the change; putting back $before"
    [ "$before" = unknown ] || say "rollback $s success=$([ "$(set_to "$s" "$before")" = success ] && echo true || echo false)"
    RC=1
  fi
done
exit $RC
