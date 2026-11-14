#!/bin/bash
# stale-if-error proof (issue 302, Sentry PATIENT-WEB-1/8/9/A): while the backend restarts, patient-web keeps serving the last good copy of
# a cached public page, a page that was never cached answers a 5xx (and is not cached as one), and Sentry hears of the outage as a
# WARNING when a copy was served and as an ERROR only when a visitor really got no page.
#   run-standalone.sh        needs: patient-web/.next/standalone built with NEXT_CACHE_HANDLER=redis and
#                            NEXT_PUBLIC_SENTRY_DSN=http://pub@127.0.0.1:4020/1 (the DSN is baked at build), redis-server, node, curl.
#   Test data only: tools/perf/stale-if-error/stub-api.mjs stands in for the backend.
set -u
HERE=$(cd "$(dirname "$0")" && pwd)
SRC=$(cd "$HERE/../../../patient-web/.next/standalone" && pwd)
W=$(mktemp -d)
cleanup() {
  kill $WEB $STUB $REDIS $SINK 2>/dev/null
  pkill -f '^next-server' 2>/dev/null   # Next renames its process; the shell's $WEB is only the wrapper
  rm -rf "$W"
}
trap cleanup EXIT
pkill -f '^next-server' 2>/dev/null; sleep 1  # a server left over from an earlier run would hold the port
EVENTS="$W/sentry.jsonl"; : > "$EVENTS"
fail=0
ok() { echo "PASS $*"; }
bad() { echo "FAIL $*"; fail=1; }
code() { curl -s -o "$2" -w '%{http_code}' --max-time 20 "http://127.0.0.1:3201$1"; }

cp -r "$SRC" "$W/app"; mkdir -p "$W/app/.next"; cp -r "$SRC/../static" "$W/app/.next/static" 2>/dev/null
node "$HERE/stub-api.mjs" 4010 & STUB=$!
node "$HERE/sentry-sink.mjs" 4020 "$EVENTS" & SINK=$!
redis-server --port 6390 --maxmemory 256mb --maxmemory-policy allkeys-lru --save "" --appendonly no --dir "$W" > "$W/redis.log" 2>&1 & REDIS=$!
(cd "$W/app" && PORT=3201 HOSTNAME=127.0.0.1 NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 NABD_API_BASE_URL=http://127.0.0.1:4010/api/v1 \
  NEXT_CACHE_REDIS_URL=redis://127.0.0.1:6390 node server.js > "$W/web.log" 2>&1) & WEB=$!
for i in $(seq 1 60); do curl -s -o /dev/null http://127.0.0.1:3201/ar/p/p-0 && break; sleep 1; done

# 1. the backend is up: the page is rendered and cached
[ "$(code /ar/p/p-1 "$W/good.html")" = 200 ] && ok "backend up: /ar/p/p-1 answers 200" || bad "backend up: /ar/p/p-1 did not answer 200"
GOOD=$(sha256sum "$W/good.html" | cut -d' ' -f1)
grep -q "Test medicine p-1" "$W/good.html" && ok "the page carries the product" || bad "the page does not carry the product"

# 2. the backend restarts (503) and the cached copy is older than its revalidate window
curl -s -X PUT http://127.0.0.1:4010/__mode/down >/dev/null
node "$HERE/age-cache.mjs" redis://127.0.0.1:6390 2
for i in 1 2 3; do
  c=$(code /ar/p/p-1 "$W/during-$i.html"); sleep 2
  H=$(sha256sum "$W/during-$i.html" | cut -d' ' -f1)
  [ "$c" = 200 ] && [ "$H" = "$GOOD" ] && ok "backend down, request $i: 200 with the last good copy" || bad "backend down, request $i: status $c, copy changed=$([ "$H" = "$GOOD" ] && echo no || echo yes)"
done

# 3. a page nobody had cached: a 5xx for the visitor, and that failure is not cached
c=$(code /ar/p/p-7 "$W/uncached.html")
case "$c" in 5??) ok "backend down, never-cached page: $c (no page, nothing invented)";; *) bad "backend down, never-cached page answered $c";; esac
curl -s -X PUT http://127.0.0.1:4010/__mode/up >/dev/null
[ "$(code /ar/p/p-7 "$W/recovered.html")" = 200 ] && ok "backend back: the same page answers 200 (the failure was not cached)" || bad "backend back: the page still fails"
[ "$(code /ar/p/p-1 "$W/after.html")" = 200 ] && ok "backend back: the cached page still answers 200" || bad "backend back: the cached page does not answer 200"

# 4. what Sentry heard: the outage is a WARNING (one group per kind of page), never an error. Next reports a first render with no copy
#    the same way as the rebuild of a page it has (revalidateReason is "stale" for both), so a visitor who got no page is seen by the 5xx
#    SLO alert, not by Sentry.
sleep 6
echo "sentry events:"; cat "$EVENTS"
WARN=$(grep -c '"level":"warning"' "$EVENTS"); ERR=$(grep -c '"level":"error"' "$EVENTS")
echo "warning events: $WARN, error events: $ERR"
[ "$WARN" -ge 1 ] && ok "the outage reached Sentry as a warning ($WARN event(s))" || bad "no warning event for the outage"
[ "$ERR" = 0 ] && ok "no error-level event for the outage" || bad "$ERR error-level event(s) for the outage"
grep -q '"fingerprint":\["public-data-unavailable","product"\]' "$EVENTS" && ok "one fingerprint per kind of page" || bad "the fingerprint is not public-data-unavailable/product"
exit $fail
