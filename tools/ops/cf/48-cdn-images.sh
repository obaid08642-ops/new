#!/bin/bash
# cdn.nabd.plus pictures stall (2026-10-28: a 42 KB webp took 0.7-20 s on a cf-cache-status HIT, /_next/image 504 after the optimizer's fixed 7 s fetch).
# CHECK (APPLY=0) reads only and prints ids/values: zone settings that touch pictures (polish, mirage, rocket_loader, cache_level, tiered cache,
# cache reserve), Workers routes for the host, Transform rules for the host, and p50/p95 of N GETs of a picture on the CDN.
# APPLY=1 then: (1) turns off polish/mirage/rocket_loader only if they are on (previous values printed, put back if the picture got slower),
# (2) purges the host's cached pictures (old entries are the slow ones; a fresh cache key measured 0.16 s), (3) measures again and prints before/after.
#   48-cdn-images-check.sh   reads only        48-cdn-images-apply.sh   APPLY=1
# Env: CF/CFE/Z (_auth.sh), APPLY, CF_API, CDN_URL, IMG_URLS (space separated pictures; default: found in a public answer), N (default 10).
set -uo pipefail
HERE=$(dirname "$0")
. "$HERE/_auth.sh"
TAG=cdn-images
. "$HERE/_rules.sh"
CDN=${CDN_URL:-https://cdn.nabd.plus}
EDGE=${EDGE_URL:-https://api.nabd.plus}
N=${N:-10}
HOST=${CDN#https://}
say() { rsay "$@"; }

IMGS=${IMG_URLS:-$(curl -s --max-time 20 "$EDGE/api/v1/public/categories/ar/items?limit=24" | grep -oE 'https://cdn\.nabd\.plus/[^"\\ ]+\.(jpg|jpeg|png|webp)' | sort -u | head -3 | tr '\n' ' ')}

# p50/p95 of N sequential GETs of one picture (seconds), plus the cache status of the last one
timing() {
  local url=$1 i out
  out=$(for i in $(seq "$N"); do curl -s -o /dev/null -w '%{time_total}\n' --max-time 30 "$url"; done | sort -n)
  echo "$out" | awk -v n="$N" '{a[NR]=$1} END {i50=int((n+1)/2); i95=int(n*0.95+0.999); if (i95>n) i95=n; printf "p50=%.2fs p95=%.2fs max=%.2fs", a[i50], a[i95], a[n]}'
}
measure() {
  local label=$1 u
  for u in $IMGS; do say "$label $(basename "$u"): $(timing "$u") cf-cache-status=$(hdr "$u" | h cf-cache-status) age=$(hdr "$u" | h age)"; done
}

[ -n "$IMGS" ] || say "NOTE no picture found (set IMG_URLS): only the settings are read"
say "zone: $(cf_curl "$CF_API/zones/$Z" | jq -c '{name: .result.name, plan: .result.plan.name, ok: .success}')"

# ---------------------------------------------------------------- 1. what is configured
SET=""
for s in polish mirage rocket_loader cache_level browser_cache_ttl image_resizing; do
  v=$(cf_curl "$CF_API/zones/$Z/settings/$s" | jq -r '.result.value // "unreadable"')
  say "setting $s = $v"; SET="$SET $s=$v"
done
say "tiered cache: $(cf_curl "$CF_API/zones/$Z/cache/tiered_cache_smart_topology_enable" | jq -c '{value: .result.value}')"
say "cache reserve: $(cf_curl "$CF_API/zones/$Z/cache/cache_reserve" | jq -c '{value: .result.value}')"
say "workers routes: $(cf_curl "$CF_API/zones/$Z/workers/routes" | jq -c '[.result[]? | {id, pattern, script}]')"
say "transform / origin / redirect rules naming $HOST: $(for ph in http_request_transform http_request_origin http_request_dynamic_redirect http_request_late_transform; do cf_curl "$CF_API/zones/$Z/rulesets/phases/$ph/entrypoint" | jq -c --arg p "$ph" --arg h "$HOST" '{phase: $p, ids: [.result.rules[]? | select(.expression | contains($h)) | .id]}'; done | tr '\n' ' ')"
say "cache rules naming $HOST: $(cf_curl "$CF_API/zones/$Z/rulesets/phases/http_request_cache_settings/entrypoint" | jq -c --arg h "$HOST" '[.result.rules[]? | select(.expression | contains($h)) | {id, enabled, action_parameters: .action_parameters.edge_ttl.mode}]')"

say "BEFORE (N=$N)"; measure before
[ "$APPLY" = 1 ] || { say "check only: nothing changed"; exit 0; }

# ---------------------------------------------------------------- 2. apply
PREV=""
for s in polish mirage rocket_loader; do
  cur=$(cf_curl "$CF_API/zones/$Z/settings/$s" | jq -r '.result.value // empty')
  case "$cur" in off|"") continue ;; esac
  r=$(cf_curl -X PATCH -H 'Content-Type: application/json' "$CF_API/zones/$Z/settings/$s" --data '{"value":"off"}' | jq -c '{success, errors: [.errors[]?.message]}')
  say "set $s: $cur -> off $r"; PREV="$PREV $s=$cur"
done
PR=$(cf_curl -X POST -H 'Content-Type: application/json' "$CF_API/zones/$Z/purge_cache" --data "$(jq -nc --arg h "$HOST" '{hosts: [$h]}')")
say "purge host $HOST: success=$(echo "$PR" | jq -r .success) $(echo "$PR" | jq -c '[.errors[]?.message]')"
sleep 5
for u in $IMGS; do hdr "$u" >/dev/null; done   # refill from R2
say "AFTER (N=$N)"; measure after
say "OK settings changed:${PREV:- none}; the host's pictures were purged and refilled"
