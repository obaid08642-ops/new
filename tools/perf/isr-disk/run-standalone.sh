#!/bin/bash
# #1603 measurement without Docker: how many bytes does rendering N product pages write to the web app's disk?
#   run-standalone.sh <redis|file> [pages=5000]
#   redis: the build as production ships it (NEXT_CACHE_HANDLER=redis) with a capped allkeys-lru Redis
#   file:  the same build with the cache handler removed from the baked-in config = what ran in production before
# Needs: patient-web/.next/standalone built with NEXT_CACHE_HANDLER=redis, redis-server, node, curl.
set -u
MODE=${1:-redis}; N=${2:-5000}
HERE=$(cd "$(dirname "$0")" && pwd)
SRC=$(cd "$HERE/../../../patient-web/.next/standalone" && pwd)
W=$(mktemp -d); trap 'kill $WEB $STUB $REDIS 2>/dev/null; rm -rf "$W"' EXIT
mb() { awk -v b="${1:-0}" 'BEGIN{printf "%.1f", b/1048576}'; }

cp -r "$SRC" "$W/app"; mkdir -p "$W/app/.next"; cp -r "$SRC/../static" "$W/app/.next/static" 2>/dev/null
if [ "$MODE" = file ]; then
  # production before the fix: no cache handler. The config is baked into server.js and required-server-files.json.
  python3 - "$W/app" <<'PY'
import json, re, sys, pathlib
root = pathlib.Path(sys.argv[1])
for f in (root / "server.js", root / ".next" / "required-server-files.json"):
    t = f.read_text()
    t = re.sub(r'"cacheHandler":"[^"]*",?', '', t)
    t = re.sub(r'"cacheMaxMemorySize":0,?', '', t)
    f.write_text(t)
print("cacheHandler keys left:", sum((root / x).read_text().count('"cacheHandler"') for x in ("server.js", ".next/required-server-files.json")))
PY
fi

node "$HERE/stub-api.mjs" 4010 & STUB=$!
redis-server --port 6390 --maxmemory 256mb --maxmemory-policy allkeys-lru --save "" --appendonly no --dir "$W" --daemonize no > "$W/redis.log" 2>&1 & REDIS=$!
(cd "$W/app" && PORT=3201 HOSTNAME=127.0.0.1 NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 NABD_API_BASE_URL=http://127.0.0.1:4010/api/v1 \
  NEXT_CACHE_REDIS_URL=redis://127.0.0.1:6390 node server.js > "$W/web.log" 2>&1) & WEB=$!
for i in $(seq 1 60); do curl -s -o /dev/null http://127.0.0.1:3201/ar/p/p-0 && break; sleep 1; done

disk() { du -sb "$W/app" | cut -f1; }
B0=$(disk)
echo "mode=$MODE pages=$N  app dir before: $(mb $B0) MB"
seq 1 "$N" | xargs -P 16 -I{} curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3201/ar/p/p-{} > "$W/codes.txt"
B1=$(disk)
echo "status codes: $(sort "$W/codes.txt" | uniq -c | tr '\n' ' ')"
echo "app dir after:  $(mb $B1) MB  (grew $(mb $((B1 - B0))) MB)"
echo "of which .next/server: $(mb $(du -sb "$W/app/.next/server" | cut -f1)) MB, .next/cache: $(mb $(du -sb "$W/app/.next/cache" 2>/dev/null | cut -f1)) MB"
redis-cli -p 6390 info memory | tr -d '\r' | grep -E '^(used_memory_human|maxmemory_human|maxmemory_policy):' | tr '\n' ' '; echo
redis-cli -p 6390 info stats | tr -d '\r' | grep -E '^(evicted_keys|keyspace_hits|keyspace_misses):' | tr '\n' ' '; echo
echo "redis keys: $(redis-cli -p 6390 dbsize)"
echo "GROWTH_BYTES=$((B1 - B0))"
