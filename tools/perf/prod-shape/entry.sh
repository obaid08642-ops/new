#!/usr/bin/env bash
# Starts MongoDB (single-node replica set), Redis and the built backend inside the limited container; the backend's own environment is passed
# in with `docker run -e`. Everything is on the host network, so the runner's seed scripts, test doubles and k6 reach it on 127.0.0.1.
#   WT_CACHE_GB      MongoDB WiredTiger cache (production's mongod.conf today: 0.5)
#   REDIS_MAXMEMORY  Redis maxmemory (default 256mb)
#   NODE_FLAGS       extra node flags (default --max-old-space-size=1500, as tools/live/start-backend.sh)
set -euo pipefail
mkdir -p /data/db /logs
mongod --replSet rs0 --bind_ip 127.0.0.1 --port 27017 --dbpath /data/db --wiredTigerCacheSizeGB "${WT_CACHE_GB:-0.5}" --quiet > /logs/mongod.log 2>&1 &
redis-server --port 6379 --save "" --appendonly no --maxmemory "${REDIS_MAXMEMORY:-256mb}" --maxmemory-policy allkeys-lru > /logs/redis.log 2>&1 &
for _ in $(seq 1 60); do mongosh --quiet --eval 'db.runCommand({ping:1}).ok' >/dev/null 2>&1 && break; sleep 1; done
mongosh --quiet --eval 'try { rs.status().ok } catch (e) { rs.initiate({_id:"rs0",members:[{_id:0,host:"127.0.0.1:27017"}]}) }' >/dev/null
for _ in $(seq 1 60); do mongosh --quiet --eval 'db.hello().isWritablePrimary' 2>/dev/null | grep -q true && break; sleep 1; done
cd /app
# shellcheck disable=SC2086
exec node ${NODE_FLAGS:---max-old-space-size=1500} dist/main.js
