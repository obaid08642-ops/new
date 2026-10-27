#!/usr/bin/env bash
# GET-only timing of the public catalogue reads: p50/p95 over N requests per URL, plus Cache-Control / x-cache-status.
# Usage: tools/perf/public-catalogue-timing.sh [base-url] [requests-per-url]
# Target after the 2026-10-27 speed fix: p95 < 150 ms uncached (first hit of a URL), < 30 ms cached (repeats).
set -u
BASE="${1:-https://nabdplus.com}"
N="${2:-20}"
PATHS=(
  "/api/v1/public/categories/ar"
  "/api/v1/public/categories/ar/items?limit=24"
  "/api/v1/public/categories/ar/items?limit=24&sort=popular"
  "/api/v1/public/categories/ar/items?limit=1"
)
for p in "${PATHS[@]}"; do
  times=()
  for _ in $(seq "$N"); do
    times+=("$(curl -s -o /dev/null -w '%{time_total}' "$BASE$p")")
  done
  hdr="$(curl -s -D - -o /dev/null "$BASE$p" | tr -d '\r' | grep -iE '^(cache-control|x-cache-status|cf-cache-status):' | tr '\n' ' ')"
  printf '%s\n' "${times[@]}" | sort -n | awk -v p="$p" -v h="$hdr" '{a[NR]=$1*1000} END {printf "%-62s p50=%4.0f ms p95=%4.0f ms max=%4.0f ms  %s\n", p, a[int((NR+1)/2)], a[int(NR*0.95+0.999)], a[NR], h}'
done
