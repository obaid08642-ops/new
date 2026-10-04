#!/bin/bash
# Q53 LiveKit key rotation, v2 (rewritten after the 2026-10-04 incident; rehearsed in
# .github/workflows/ops-rehearsal.yml, including the rollback path).
# A new key/secret is generated ON THE SERVER and never printed. Order:
#   0. pre-checks (nginx -t, backend healthy) and pin the exact running backend image
#   1. backups; write .env.production + livekit.yaml (verified before writing)
#   2. restart LiveKit, wait for health
#   3. recreate the backend (same image), wait for health
#   4. nginx -t + reload (exit codes checked), external liveness 200
# Any failure: restore both files, LiveKit, backend (same image), nginx; verify; exit 1.
# REHEARSE_FAIL_AT=<step> forces a failure (rehearsal only).
set -u
D=${OPS_DEPLOY_DIR:-/opt/nabdah/deploy}
B=${OPS_BACKUP_DIR:-/opt/nabdah/backups}
TS=$(date -u +%Y%m%dT%H%M%SZ)
DK="sudo -n docker"
NGX="$DK exec nabdah-nginx"
ENVF=$D/.env.production
LK=$D/livekit/livekit.yaml
FAIL_AT=${REHEARSE_FAIL_AT:-}
COMPOSE="$DK compose -f $D/docker-compose.production.yml --project-directory $D --env-file $ENVF"
echo "## livekit-rotate"

health() { $DK inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$1" 2>/dev/null; }
wait_healthy() { local s; for i in $(seq 1 "$2"); do s=$(health "$1"); [ "$s" = healthy ] && return 0; sleep 5; done; echo "rotate: $1 health=$s"; return 1; }
nginx_reload() { $NGX nginx -t >/dev/null 2>&1 || { echo "rotate: nginx -t FAILED"; return 1; }; $NGX nginx -s reload >/dev/null 2>&1 || { echo "rotate: nginx reload FAILED"; return 1; }; sleep 2; }
api_ok() { local c; for i in $(seq 1 12); do c=$(curl -sk -o /dev/null -w '%{http_code}' --max-time 8 -H 'Host: api.nabd.plus' https://127.0.0.1/api/v1/health/liveness); [ "$c" = 200 ] && return 0; sleep 5; done; echo "rotate: api liveness=$c"; return 1; }
forced() { [ "$FAIL_AT" = "$1" ] && echo "rotate: (rehearsal) forced failure at $1" && return 0; return 1; }

# --- 0. pre-checks and pin
$NGX nginx -t >/dev/null 2>&1 || { echo "rotate: ABORT nginx -t fails before starting"; exit 1; }
[ "$(health nabdah-backend)" = healthy ] || { echo "rotate: ABORT backend not healthy before starting"; exit 1; }
RUNIMG=$($DK inspect -f '{{.Image}}' nabdah-backend)
$DK tag "$RUNIMG" nabdah-prod-backend:latest && $DK tag "$RUNIMG" nabdah-prod-backend:prev-$TS
echo "rotate: pre-checks ok; backend image pinned (${RUNIMG:7:12})"

# --- 1. backups and new files
sudo -n mkdir -p $B
sudo -n cp -p $ENVF $B/env.production.pre-rotate.$TS && sudo -n chmod 600 $B/env.production.pre-rotate.$TS
sudo -n cp -p $LK $B/livekit.yaml.pre-rotate.$TS
restore() {
  echo "rotate: FAILED at '$1', rolling back"
  sudo -n sh -c "cat $B/env.production.pre-rotate.$TS > $ENVF"
  sudo -n sh -c "cat $B/livekit.yaml.pre-rotate.$TS > $LK"
  $DK restart nabdah-livekit >/dev/null 2>&1; wait_healthy nabdah-livekit 36
  $DK tag "$RUNIMG" nabdah-prod-backend:latest
  $COMPOSE up -d --no-deps --no-build --force-recreate backend >/dev/null 2>&1
  wait_healthy nabdah-backend 48
  nginx_reload && api_ok && echo "rotate: rollback complete, api 200, old key back in place" || echo "rotate: ROLLBACK INCOMPLETE - needs attention"
  exit 1
}
NEWK="nabd_$(openssl rand -hex 6)"
NEWS="$(openssl rand -hex 32)"
TE=$(mktemp); TL=$(mktemp)
sudo -n cat $ENVF > $TE
sudo -n cat $LK > $TL
grep -q '^LIVEKIT_API_KEY=' $TE && grep -q '^LIVEKIT_API_SECRET=' $TE || { rm -f $TE $TL; restore "env keys not found"; }
sed -i -E "s|^LIVEKIT_API_KEY=.*|LIVEKIT_API_KEY=$NEWK|; s|^LIVEKIT_API_SECRET=.*|LIVEKIT_API_SECRET=$NEWS|" $TE
awk -v k="$NEWK" -v s="$NEWS" '
  /^keys:/ {print; print "  " k ": " s; skip=1; next}
  skip && /^[[:space:]]+[^[:space:]]/ {next}
  {skip=0; print}' $TL > $TL.new
okenv=$(grep -c "^LIVEKIT_API_KEY=$NEWK\$" $TE); lines_e=$(( $(sudo -n cat $ENVF | wc -l) - $(wc -l < $TE) ))
okyaml=$(awk '/^keys:/{f=1;next} f&&/^  [^ ]/{n++} f&&!/^  /{f=0} END{print n+0}' $TL.new)
if [ "$okenv" = 1 ] && [ "$lines_e" = 0 ] && [ "$okyaml" = 1 ] && grep -q "^  $NEWK: " $TL.new && [ -s $TL.new ]; then
  sudo -n sh -c "cat $TE > $ENVF"; sudo -n sh -c "cat $TL.new > $LK"
else
  rm -f $TE $TL $TL.new; restore "file rewrite check (env=$okenv lines=$lines_e yaml_keys=$okyaml)"
fi
rm -f $TE $TL $TL.new; unset NEWS
echo "rotate: new key written to .env.production and livekit.yaml (old keys removed)"

# --- 2. LiveKit
$DK restart nabdah-livekit >/dev/null 2>&1
forced livekit && restore "livekit (forced)"
wait_healthy nabdah-livekit 36 || restore "livekit health"
echo "rotate: livekit healthy with the new key"

# --- 3. backend
$COMPOSE up -d --no-deps --no-build --force-recreate backend >/dev/null 2>&1 || restore "backend recreate"
forced backend && restore "backend (forced)"
wait_healthy nabdah-backend 48 || restore "backend health"
[ "$($DK inspect -f '{{.Image}}' nabdah-backend)" = "$RUNIMG" ] || restore "backend image changed"
$DK exec nabdah-backend sh -c "[ \"\$LIVEKIT_API_KEY\" = \"$NEWK\" ]" || restore "backend does not see the new key"
echo "rotate: backend healthy on the same image and sees the new key"

# --- 4. nginx and external check
nginx_reload || restore "nginx reload"
api_ok || restore "api liveness"
echo "rotate: nginx reloaded, api 200"
echo "## livekit-rotate done"
