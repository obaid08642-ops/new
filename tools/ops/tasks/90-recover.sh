#!/bin/bash
# Recovery after the 35-livekit-rotate run left api.nabd.plus answering 502.
# Most likely cause: the backend container was recreated (new IP) and nginx still holds the old
# upstream address. Reload nginx (graceful, re-resolves upstreams); start the backend if it is
# not running; print the state needed to diagnose. Prints no secret values.
set +e
D=/opt/nabdah/deploy
DK="sudo -n docker"
NGX="$DK exec nabdah-nginx"
mask() { sed -E 's#(://)[^:@/ ]+:[^@/ ]+@#\1***:***@#g; s#(SECRET|PASSWORD|TOKEN|KEY)([A-Z_]*)[=:] *[^ ]+#\1\2=***#g'; }
echo "## recover"
echo "deploy: containers: $($DK ps -a --format '{{.Names}}={{.Status}}' | grep -E 'backend|livekit|nginx' | tr '\n' ' ')"
st=$($DK inspect -f '{{.State.Status}}' nabdah-backend 2>/dev/null)
if [ -z "$st" ]; then
  echo "deploy: backend container missing, creating it"
  cd $D && $DK compose -f docker-compose.production.yml --env-file .env.production up -d --no-deps --no-build backend 2>&1 | mask | tail -5
elif [ "$st" != running ]; then
  echo "deploy: backend $st, starting it"; $DK start nabdah-backend >/dev/null
fi
# The rotate rollback recreated the backend from the :latest tag, which (before the pin step ran)
# pointed at the staging build, not the image production was running (ad589b9f26e6). Put it back.
PROD=ad589b9f26e6
cur=$($DK inspect -f '{{.Image}}' nabdah-backend 2>/dev/null | cut -c8-19)
echo "deploy: backend image now=$cur expected=$PROD"
if [ -n "$cur" ] && [ "$cur" != "$PROD" ] && $DK image inspect $PROD >/dev/null 2>&1; then
  $DK tag $PROD nabdah-prod-backend:latest
  cd $D && $DK compose -f docker-compose.production.yml --env-file .env.production up -d --no-deps --no-build --force-recreate backend 2>&1 | mask | tail -3
  echo "deploy: backend recreated from the production image $PROD"
fi
for i in $(seq 1 36); do h=$($DK inspect -f '{{.State.Health.Status}}' nabdah-backend 2>/dev/null); [ "$h" = healthy ] && break; sleep 5; done
echo "deploy: backend health=$h"
$NGX nginx -t >/dev/null 2>&1 && $NGX nginx -s reload && echo "deploy: nginx reloaded"
sleep 3
echo "deploy: api liveness via nginx: $(curl -sk -o /dev/null -w '%{http_code}' --max-time 10 -H 'Host: api.nabd.plus' https://127.0.0.1/api/v1/health/liveness)"
echo "deploy: livekit health=$($DK inspect -f '{{.State.Health.Status}}' nabdah-livekit 2>/dev/null)"
echo "deploy: livekit.yaml key entries=$(sudo -n awk '/^keys:/{f=1;next} f&&/^  [^ ]/{n++} f&&!/^  /{f=0} END{print n+0}' $D/livekit/livekit.yaml)"
echo "deploy: rotate backups present: $(ls /opt/nabdah/backups | grep -c pre-rotate)"
echo; echo "-- livekit logs (masked)"; $DK logs --since 20m nabdah-livekit 2>&1 | mask | tail -25 | cut -c1-240
echo; echo "-- backend logs (masked)"; $DK logs --since 10m nabdah-backend 2>&1 | mask | grep -iE 'error|fail|listen|started|livekit' | tail -25 | cut -c1-240
echo; echo "-- staging"; $DK ps -a --format '{{.Names}}\t{{.Status}}' | grep staging; ls $D/nginx/conf.d | grep staging
echo "-- memory"; free -m
echo "## recover done"
