#!/bin/bash
# Recover the services after the root disk filled up (review session, 2026-10-16; the build session found Redis
# "MISCONF ... No space left on device" and mongodb dropping off the network since 07:00 UTC, every API route 500).
# Runs after 59-free-disk. Never removes a container, volume or data: it only starts stopped services with
# --no-recreate, lets Redis save again, and restarts backend + worker once if readiness is still not ok.
# Public log lines start with "recover:". Secrets are never printed (the Redis password goes to redis-cli on stdin).
set +e
D=${OPS_DEPLOY_DIR:-/opt/nabdah/deploy}
ENVF=$D/.env.production
DK="sudo -n docker"
COMPOSE="$DK compose -f $D/docker-compose.production.yml -f $D/docker-compose.release.yml --project-directory $D --env-file $ENVF"
[ -f $D/docker-compose.release.yml ] || COMPOSE="$DK compose -f $D/docker-compose.production.yml --project-directory $D --env-file $ENVF"
H_API='Host: api.nabd.plus'
free_mb() { df -Pm / | awk 'NR==2{print $4}'; }
cid() { $COMPOSE ps -q "$1" 2>/dev/null | head -1; }
health() { $DK inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$1" 2>/dev/null; }
ready() { curl -sk --max-time 10 -H "$H_API" https://127.0.0.1/api/v1/health/readiness; }
redis() { P=$(sudo -n grep -E '^REDIS_PASSWORD=' $ENVF | cut -d= -f2-); { printf 'AUTH %s\n' "$P"; printf '%s\n' "$@"; } | $DK exec -i "$(cid redis)" redis-cli --no-auth-warning 2>/dev/null | tail -n +2; unset P; }

echo "recover: free on / = $(free_mb) MB"
[ "$(free_mb)" -ge 1024 ] || { echo "recover: STOP, under 1 GB free after the cleanup; nothing started"; exit 99; }

echo "recover: before: $(for s in mongodb redis backend worker; do printf '%s=%s ' $s "$(health "$(cid $s)")"; done)"
echo "recover: readiness before: $(ready | head -c 300)"

# 1. start the data services if they stopped (no recreate: same containers, same volumes)
$COMPOSE up -d --no-build --no-deps --no-recreate mongodb redis >/dev/null 2>&1
for s in mongodb redis; do
  for i in $(seq 1 36); do [ "$(health "$(cid $s)")" = healthy ] && break; sleep 5; done
  echo "recover: $s health=$(health "$(cid $s)")"
done

# 2. Redis: refuses writes until a save succeeds again
echo "recover: redis persistence before: $(redis 'INFO persistence' | grep -E '^(rdb_last_bgsave_status|aof_last_write_status|aof_enabled):' | tr -d '\r' | tr '\n' ' ')"
redis BGSAVE >/dev/null
sleep 10
st=$(redis 'INFO persistence' | grep -E '^(rdb_last_bgsave_status|aof_last_write_status):' | tr -d '\r' | tr '\n' ' ')
echo "recover: redis persistence after BGSAVE: $st"
if echo "$st" | grep -q 'err'; then
  echo "recover: redis still reports a write error; restarting the redis container once (data volume kept)"
  $COMPOSE restart redis >/dev/null 2>&1
  for i in $(seq 1 36); do [ "$(health "$(cid redis)")" = healthy ] && break; sleep 5; done
  echo "recover: redis health=$(health "$(cid redis)") $(redis 'INFO persistence' | grep -E '^(rdb_last_bgsave_status|aof_last_write_status):' | tr -d '\r' | tr '\n' ' ')"
fi
echo "recover: redis write probe: $(redis 'SET ops:recover:probe 1 EX 60')"

# 3. readiness; restart backend + worker once if still not ok
R=$(ready)
if ! echo "$R" | grep -q '"status":"ok"'; then
  echo "recover: readiness not ok, restarting backend and worker once"
  $COMPOSE restart backend worker >/dev/null 2>&1
  for i in $(seq 1 36); do R=$(ready); echo "$R" | grep -q '"status":"ok"' && echo "$R" | grep -q '"background_worker":"up"' && break; sleep 5; done
fi
echo "recover: readiness after: $(echo "$R" | head -c 400)"
for p in /api/v1/public/products/search?q=x /api/v1/legal/policy/privacy?lang=ar; do
  echo "recover: GET $p -> $(curl -sk -o /dev/null -w '%{http_code}' --max-time 10 -H "$H_API" "https://127.0.0.1$p")"
done
echo "recover: GET /ar -> $(curl -sk -o /dev/null -w '%{http_code}' --max-time 10 -H 'Host: nabd.plus' https://127.0.0.1/ar)"
echo "recover: free on / at the end = $(free_mb) MB"
