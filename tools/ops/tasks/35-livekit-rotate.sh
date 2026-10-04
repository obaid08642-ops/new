#!/bin/bash
# Q53 (owner-delegated 2026-10-04): the LiveKit key/secret in use is the one committed to the
# public repo, so anyone could mint call tokens. Generate a new pair ON THE SERVER (it never
# leaves it and is never printed), write it to .env.production and livekit.yaml (only the new
# key; the leaked line and the literal "${LIVEKIT_API_KEY}" line are dropped), restart LiveKit,
# then recreate the backend with the SAME image it runs now so it picks up the new env.
# Backups first; any failed check restores both files and restarts.
set -u
D=/opt/nabdah/deploy
TS=$(date -u +%Y%m%dT%H%M%SZ)
DK="sudo -n docker"
ENVF=$D/.env.production
LK=$D/livekit/livekit.yaml
B=/opt/nabdah/backups
echo "## livekit-rotate"
sudo -n cp -p $ENVF $B/env.production.pre-rotate.$TS && sudo -n chmod 600 $B/env.production.pre-rotate.$TS
sudo -n cp -p $LK $B/livekit.yaml.pre-rotate.$TS
echo "rotate: backups written ($TS)"

restore() {
  echo "rotate: FAILED at '$1', restoring"
  sudo -n cp -p $B/env.production.pre-rotate.$TS $ENVF
  sudo -n sh -c "cat $B/livekit.yaml.pre-rotate.$TS > $LK"
  $DK restart nabdah-livekit >/dev/null
  cd $D && $DK compose -f docker-compose.production.yml --env-file .env.production up -d --no-deps --no-build --force-recreate backend >/dev/null 2>&1
  wait_healthy nabdah-backend 36; sudo -n docker exec nabdah-nginx nginx -s reload  # new container IP
  echo "rotate: restored previous key"; exit 1
}
wait_healthy() { for i in $(seq 1 $2); do s=$($DK inspect -f '{{.State.Health.Status}}' $1 2>/dev/null); [ "$s" = healthy ] && return 0; sleep 5; done; return 1; }

NEWK="nabd_$(openssl rand -hex 6)"
NEWS="$(openssl rand -hex 32)"
sudo -n grep -q "^LIVEKIT_API_KEY=" $ENVF && sudo -n grep -q "^LIVEKIT_API_SECRET=" $ENVF || restore "env keys not found"
sudo -n sed -i "s|^LIVEKIT_API_KEY=.*|LIVEKIT_API_KEY=$NEWK|; s|^LIVEKIT_API_SECRET=.*|LIVEKIT_API_SECRET=$NEWS|" $ENVF
# keys: block -> exactly one entry (the new pair)
TMP=$(mktemp)
awk -v k="$NEWK" -v s="$NEWS" '
  /^keys:/ {print; print "  " k ": " s; skip=1; next}
  skip && /^[[:space:]]+[^[:space:]]/ {next}
  {skip=0; print}' $LK > $TMP
grep -q "^  $NEWK: " $TMP && [ "$(awk '/^keys:/{f=1;next} f&&/^  [^ ]/{n++} f&&!/^  /{f=0} END{print n+0}' $TMP)" = 1 ] || { rm -f $TMP; restore "livekit.yaml rewrite"; }
sudo -n sh -c "cat $TMP > $LK"; rm -f $TMP
unset NEWS
echo "rotate: new key written; old keys removed from livekit.yaml"

$DK restart nabdah-livekit >/dev/null || restore "livekit restart"
wait_healthy nabdah-livekit 24 || restore "livekit health"
echo "rotate: livekit healthy with the new key"

RUNIMG=$($DK inspect -f '{{.Image}}' nabdah-backend)
OLDLATEST=$($DK image inspect -f '{{.Id}}' nabdah-prod-backend:latest 2>/dev/null)
[ -n "$OLDLATEST" ] && [ "$OLDLATEST" != "$RUNIMG" ] && $DK tag "$OLDLATEST" nabdah-prod-backend:staging-old-$TS
$DK tag "$RUNIMG" nabdah-prod-backend:latest
$DK tag "$RUNIMG" nabdah-prod-backend:prev-$TS
echo "rotate: backend image pinned (same image as before: ${RUNIMG:7:12})"
cd $D && $DK compose -f docker-compose.production.yml --env-file .env.production up -d --no-deps --no-build --force-recreate backend >/dev/null 2>&1 || restore "backend recreate"
wait_healthy nabdah-backend 36 || restore "backend health"
sudo -n docker exec nabdah-nginx nginx -s reload && echo "rotate: nginx reloaded (backend has a new container IP)"
code=$(curl -sk -o /dev/null -w '%{http_code}' --max-time 10 -H 'Host: api.nabd.plus' https://127.0.0.1/api/v1/health/liveness)
echo "rotate: backend healthy; api liveness via nginx: $code"
[ "$($DK inspect -f '{{.Image}}' nabdah-backend)" = "$RUNIMG" ] && echo "rotate: backend runs the same image as before"
$DK exec nabdah-backend sh -c '[ "$LIVEKIT_API_KEY" = "'"$NEWK"'" ] && echo "rotate: backend sees the new key"'
echo "## livekit-rotate done"
