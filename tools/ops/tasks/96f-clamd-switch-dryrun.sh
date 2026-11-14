#!/bin/bash
# R9 DRY RUN of the scanner switch (docs/ops/REMOTE_CLAMD.md step 7). READ-ONLY: nothing is edited, started, stopped or recreated. It reads .env.production and the compose file and says,
# for each of the four switch settings, whether it is set today and whether the switch would change it, and whether docker-compose.production.yml reads it for BOTH the backend and the worker.
# Prints `status:` lines only: names and yes/no/kind, never a value. The new scanner address comes from CLAMD_NEW_HOST (set in this file by the reviewer); empty = only the current state is shown.
# Apply (by hand, the reviewer): the commands of REMOTE_CLAMD.md step 7. This script never does.
set -u
CLAMD_NEW_HOST=""
CLAMD_NEW_PORT="3310"
D=${OPS_DEPLOY_DIR:-/opt/nabdah/deploy}
ENVF=$D/.env.production
COMPOSE=$D/docker-compose.production.yml
say() { echo "status: clamd-switch-dryrun: $*"; }
echo "## clamd-switch-dryrun (nothing is changed)"
[ -r "$ENVF" ] || { say "cannot read the env file: nothing to compare"; ENVF=/dev/null; }
cur() { grep -E "^$1=" "$ENVF" 2>/dev/null | tail -1 | cut -d= -f2-; }
kind() { case "$1" in
  "") echo none;;
  10.*|192.168.*|172.1[6-9].*|172.2[0-9].*|172.3[01].*|100.6[4-9].*|100.[7-9][0-9].*|100.1[01][0-9].*|100.12[0-7].*|127.*) echo private;;
  [0-9]*.[0-9]*.[0-9]*.[0-9]*) echo PUBLIC;;
  *.*) echo dns-name;;
  *) echo service-name;;
esac; }
want() { # name wanted-value
  local c; c=$(cur "$1")
  if [ -z "$c" ]; then say "$1: not set today -> would be set"
  elif [ "$c" = "$2" ]; then say "$1: already the wanted value -> no change"
  else say "$1: set today to another value -> would change"; fi
}
if [ -n "$CLAMD_NEW_HOST" ]; then
  k=$(kind "$CLAMD_NEW_HOST")
  say "new scanner address kind=$k port=$CLAMD_NEW_PORT"
  [ "$k" = PUBLIC ] && say "REFUSE: a public address for clamd (no login, the file travels in clear); use the private link of REMOTE_CLAMD.md step 2"
  want CLAMD_HOST "$CLAMD_NEW_HOST"; want CLAMD_PORT "$CLAMD_NEW_PORT"
else
  say "CLAMD_NEW_HOST empty: showing the current state only"
  say "CLAMD_HOST today: kind=$(kind "$(cur CLAMD_HOST)")"
fi
want UPLOAD_SCAN required; want CLAMAV_ON_DEMAND 0
for v in CLAMD_HOST CLAMD_PORT; do
  n=$(grep -c "$v: \${$v:-" "$COMPOSE" 2>/dev/null); [ "${n:-0}" -ge 2 ] && say "compose reads $v for backend and worker: yes" || say "compose reads $v for backend and worker: NO ($n of 2)"
done
say "next (by hand, reviewer): REMOTE_CLAMD.md step 5 (96d-clamd-check.sh on the candidate), then step 7"
