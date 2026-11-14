#!/bin/bash
# Read-only TTFB comparison of routes in ONE time window: GET only, N rounds, each round asks every route once, so a drifting network floor (the sandbox proxy moved
# from 150 ms to 13 ms within an hour on 2026-11-02) hits every route alike. Prints median / min / max in ms per route and the response status.
#   tools/perf/ttfb-interleaved.sh [BASE_URL] [ROUNDS] route1 route2 ...      e.g.  tools/perf/ttfb-interleaved.sh https://nabd.plus 12 /robots.txt /ar/login /ar/nursing/service-info
# A route that answers 307/308 is a redirect: its time is the redirect itself, not the page it leads to.
set -u
BASE=${1:-https://nabd.plus}; ROUNDS=${2:-12}; shift 2 2>/dev/null
ROUTES=("$@"); [ ${#ROUTES[@]} -gt 0 ] || ROUTES=(/robots.txt /ar/login /ar/pharmacy /ar/nursing/service-info /ar/consultations/clinic-confirm /ar/consultations/waiting-room /ar/pharmacy/filters /ar/consultations/follow-up /ar/labs/when)
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
for i in $(seq 1 "$ROUNDS"); do
  for r in "${ROUTES[@]}"; do curl -s -o /dev/null -m 25 -H 'Accept-Language: ar' -w '%{time_starttransfer}\n' "$BASE$r" >> "$T/$(echo "$r" | tr '/?&=' '____')"; done
done
for r in "${ROUTES[@]}"; do
  f="$T/$(echo "$r" | tr '/?&=' '____')"; code=$(curl -s -o /dev/null -m 25 -w '%{http_code}' "$BASE$r")
  printf '%-48s %s median=%4.0fms min=%4.0f max=%4.0f\n' "$r" "$code" "$(sort -n "$f" | sed -n "$(( (ROUNDS + 1) / 2 ))p" | awk '{print $1*1000}')" "$(sort -n "$f" | head -1 | awk '{print $1*1000}')" "$(sort -n "$f" | tail -1 | awk '{print $1*1000}')"
done
