#!/bin/bash
# ═══ Capacity sampler (20.10): one JSON line every 15 minutes ═══
# The monthly capacity review (tools/perf/capacity-review/review.py, docs/perf/CAPACITY_REVIEW.md) needs numbers over
# time, not a snapshot. This appends one line per run to $CAPACITY_DIR/samples.jsonl (default /var/lib/nabdah-capacity)
# and keeps the last 40 days. Every probe fails on its own: a missing signal is null, never a failed run. Read-only.
# Signals: host CPU busy %, RAM, disk; the API's scrape (all-route latency buckets, requests, 5xx, event-loop lag, open
# sockets); MongoDB (WiredTiger cache pages read vs requested, connections); Redis (hits, misses, evictions, memory).
# Test hooks: CAPACITY_PROC (a folder with stat and meminfo), CAPACITY_NOW_EPOCH. Schedule: deploy/cron/nabd-backups.
cd "$(dirname "$0")/.." 2>/dev/null || true
set -a; [ -f .env.production ] && source .env.production 2>/dev/null; set +a
DIR=${CAPACITY_DIR:-/var/lib/nabdah-capacity}
PROC=${CAPACITY_PROC:-/proc}
mkdir -p "$DIR" 2>/dev/null || exit 0

# CPU: busy share of all cores over one second
cpu_busy() {
  local a b
  a=$(awk '/^cpu /{print $2+$3+$4+$7+$8, $2+$3+$4+$5+$6+$7+$8}' "$PROC/stat" 2>/dev/null); sleep 1
  b=$(awk '/^cpu /{print $2+$3+$4+$7+$8, $2+$3+$4+$5+$6+$7+$8}' "$PROC/stat" 2>/dev/null)
  awk -v a="$a" -v b="$b" 'BEGIN{split(a,x," "); split(b,y," "); d=y[2]-x[2]; if (d>0) printf "%.1f", 100*(y[1]-x[1])/d}'
}
CPU=$(cpu_busy)
CORES=$(nproc 2>/dev/null)
LOAD1=$(awk '{print $1}' "$PROC/loadavg" 2>/dev/null)
MEM=$(awk '/MemTotal/{t=$2}/MemAvailable/{a=$2}END{if(t>0)printf "%.1f", 100*(t-a)/t}' "$PROC/meminfo" 2>/dev/null)
DISK=$(df -Pk / 2>/dev/null | awk 'NR==2{gsub(/%/,"",$5); print $5}')

dk() { timeout 15 docker exec "$@" 2>/dev/null; }
API=""
[ -n "${METRICS_SCRAPE_TOKEN:-}" ] && API=$(dk nabdah-backend wget -qO- --header "Authorization: Bearer $METRICS_SCRAPE_TOKEN" http://127.0.0.1:8002/api/v1/observability/metrics)
MONGO=$(dk nabdah-mongodb mongosh --quiet -u "${MONGO_ROOT_USER:-}" -p "${MONGO_ROOT_PASSWORD:-}" --authenticationDatabase admin --eval \
  'const s=db.serverStatus(); const c=s.wiredTiger.cache; print(JSON.stringify({cache_read:c["pages read into cache"],cache_req:c["pages requested from the cache"],conns:s.connections.current}))' | tail -1)
REDIS=$(dk nabdah-redis redis-cli --no-auth-warning -a "${REDIS_PASSWORD:-}" INFO | tr -d '\r')

API_TEXT="$API" REDIS_TEXT="$REDIS" python3 - "$DIR" "${CAPACITY_NOW_EPOCH:-$(date +%s)}" "$CPU" "$CORES" "$LOAD1" "$MEM" "$DISK" "$MONGO" <<'PY'
import json, re, sys, os
d, now, cpu, cores, load1, mem, disk, mongo = sys.argv[1:9]
api_text = os.environ.get("API_TEXT", "")
redis_text = os.environ.get("REDIS_TEXT", "")
def num(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return None
row = {"ts": int(now), "cpu_busy_pct": num(cpu), "cores": num(cores), "load1": num(load1), "mem_used_pct": num(mem), "disk_used_pct": num(disk)}
if api_text.strip():
    buckets, req, err = {}, 0.0, 0.0
    for line in api_text.splitlines():
        m = re.match(r'nabd_http_duration_ms_bucket\{[^}]*le="([^"]+)"[^}]*\} (\S+)', line)
        if m:
            buckets[m.group(1)] = buckets.get(m.group(1), 0) + float(m.group(2))
        m = re.match(r'nabd_http_requests_total\{[^}]*\} (\S+)', line)
        if m:
            req += float(m.group(1))
        m = re.match(r'nabd_http_errors_total\{[^}]*\} (\S+)', line)
        if m:
            err += float(m.group(1))
    def gauge(name):
        m = re.search(r'^' + name + r' (\S+)$', api_text, re.M)
        return num(m.group(1)) if m else None
    row["api"] = {"buckets": buckets, "requests": req, "errors": err, "uptime_s": gauge("nabd_uptime_seconds"),
                  "event_loop_ms": gauge("nabd_event_loop_lag_ms"), "rss": gauge("nabd_rss_bytes"), "ws": gauge("nabd_ws_connections")}
try:
    row["mongo"] = json.loads(mongo)
except ValueError:
    row["mongo"] = None
r = {}
for k in ("keyspace_hits", "keyspace_misses", "evicted_keys", "used_memory"):
    m = re.search(r'^' + k + r':(\d+)', redis_text, re.M)
    r[k] = int(m.group(1)) if m else None
row["redis"] = r if any(v is not None for v in r.values()) else None
path = os.path.join(d, "samples.jsonl")
lines = open(path).read().splitlines() if os.path.exists(path) else []
lines.append(json.dumps(row, separators=(",", ":")))
open(path, "w").write("\n".join(lines[-3840:]) + "\n")  # 40 days at 15 minutes
PY
