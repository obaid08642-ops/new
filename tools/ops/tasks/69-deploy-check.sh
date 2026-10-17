#!/bin/bash
# Read-only check of what production runs (review session, 2026-10-17): the owner asked whether the Antigravity
# deploy of main happened. Prints the release dirs and their SHA, each container's image, creation and start time,
# patient-web's read_only flag and cache handler (#1610), redis-cache, log caps, free disk and readiness.
# Changes nothing: no restart, no pull, no write. Public lines start with "recover:" (the workflow's public grep).
set +e
D=${OPS_DEPLOY_DIR:-/opt/nabdah/deploy}; DK="sudo -n docker"; H_API='Host: api.nabd.plus'
echo "recover: now $(date -u +%FT%TZ) free on / = $(df -Pm / | awk 'NR==2{print $4}') MB"
for r in $(ls -1dt /opt/nabdah/releases/*/ 2>/dev/null | head -5); do
  echo "recover: release $(basename $r) sha=$(cat $r/SHA 2>/dev/null | cut -c1-12) dir_mtime=$(date -u -r $r +%FT%TZ)"
done
echo "recover: compose files mtime: $(for f in docker-compose.production.yml docker-compose.release.yml; do [ -f $D/$f ] && printf '%s=%s ' $f $(date -u -r $D/$f +%FT%TZ); done)"
for c in $($DK ps --format '{{.Names}}' | sort); do
  echo "recover: $c $($DK inspect -f 'image={{.Config.Image}} created={{.Created}} started={{.State.StartedAt}} health={{if .State.Health}}{{.State.Health.Status}}{{end}} ro={{.HostConfig.ReadonlyRootfs}} log={{index .HostConfig.LogConfig.Config "max-size"}}' $c 2>/dev/null | cut -c1-260)"
done
W=$($DK ps --format '{{.Names}}' | grep -m1 -i 'patient-web\|web')
[ -n "$W" ] && echo "recover: $W NEXT_CACHE_HANDLER=$($DK inspect -f '{{range .Config.Env}}{{println .}}{{end}}' $W | grep -E '^NEXT_CACHE_HANDLER=' | cut -d= -f2) size=$($DK ps -s --filter name=$W --format '{{.Size}}')"
R=$($DK ps --format '{{.Names}}' | grep -m1 'redis-cache')
echo "recover: redis-cache container: ${R:-absent}"
echo "recover: readiness $(curl -sk --max-time 10 -H "$H_API" https://127.0.0.1/api/v1/health/readiness | head -c 200)"
