#!/bin/bash
# Would a ClamAV scan window FIT on this host? READ-ONLY, one run, nothing is started, stopped or written. It does the arithmetic of docs/ops/CLAMAV_WINDOW_PROPOSAL.md with the numbers of
# THIS host right now, so the choice between "pause some containers for the window" and "remote scanner" rests on measurements, not on reservations:
#   free now = MemAvailable (/proc/meminfo); needed = CLAMAV_MIN_FREE_MB (the start rule of clamav-window.sh, 1700 unless set) and clamd's own need (about 1200 to 1500 MB, docs/ops/UPLOAD_SCAN_3_8GB.md)
#   for each candidate pause set (cumulative): what those containers use RIGHT NOW (`docker stats`), the free memory that would give, and whether the window would start.
# Sets, from the least to the most disruptive: A optional (admin-web fastapi meilisearch redis-cache), B = A + worker (cron jobs and queues stop for the scan), C = B + patient-web (the public website is DOWN for the scan).
# The answer is an estimate: freeing a container's resident memory does not return all of it as MemAvailable, and the signatures take 1 to 2 minutes to load. A "yes" means "worth a trial",
# a "no" means no setting of the window script can make it start without swap. Prints `status:` lines only: names and MB, never a value of the environment.
set -u
D=${OPS_DEPLOY_DIR:-/opt/nabdah/deploy}
ENVF=$D/.env.production
MEMINFO=${OPS_MEMINFO:-/proc/meminfo}
DK="sudo -n docker"
SET_A="admin-web fastapi meilisearch redis-cache"
SET_B="$SET_A worker"
SET_C="$SET_B patient-web"
CLAMD_NEED_LOW=1200
CLAMD_NEED_HIGH=1500
echo "## clamav-fit"
say() { echo "status: clamav-fit: $*"; }
num() { case "$1" in ''|*[!0-9]*) echo "$2";; *) echo "$1";; esac; }

FREE=$(awk '/^MemAvailable:/ {print int($2/1024)}' "$MEMINFO" 2>/dev/null); FREE=$(num "$FREE" 0)
SWAP_USED=$(awk '/SwapTotal/ {t=$2} /SwapFree/ {f=$2} END {print int((t-f)/1024)}' "$MEMINFO" 2>/dev/null); SWAP_USED=$(num "$SWAP_USED" 0)
MINV=$(sudo -n grep -m1 '^CLAMAV_MIN_FREE_MB=' "$ENVF" 2>/dev/null | cut -d= -f2- | tr -d '"'"'"); MIN_FREE=$(num "$MINV" 1700)
say "free now: MemAvailable=${FREE}MB swap_used=${SWAP_USED}MB; the window starts ClamAV at >= ${MIN_FREE}MB free (clamd itself needs ${CLAMD_NEED_LOW} to ${CLAMD_NEED_HIGH}MB)"

# `docker stats` prints "123.4MiB / 1.5GiB" or "1.2GiB / ..."; one MB number per container
STATS=$($DK stats --no-stream --format '{{.Name}}={{.MemUsage}}' 2>/dev/null < /dev/null)
use_mb() {
  echo "$STATS" | sed -n "s/^nabdah-$1=\([0-9.]*\)\([KMG]i\?B\) .*/\1 \2/p" | head -1 | awk '{v=$1; u=$2; if (u ~ /^G/) v*=1024; else if (u ~ /^K/) v/=1024; printf "%d", v+0.5}'
}
set_sum() { local s=0 c m; for c in $1; do m=$(use_mb "$c"); s=$((s + $(num "$m" 0))); done; echo "$s"; }
detail() { local c m out=""; for c in $1; do m=$(use_mb "$c"); out="$out $c=$(num "$m" 0)MB"; done; echo "${out# }"; }

verdict() {   # $1 = projected free MB
  if [ "$1" -ge "$MIN_FREE" ]; then echo "yes (meets CLAMAV_MIN_FREE_MB)"
  elif [ "$1" -ge $((CLAMD_NEED_HIGH + 100)) ]; then echo "only if CLAMAV_MIN_FREE_MB is lowered to $((CLAMD_NEED_HIGH + 100)) or below"
  elif [ "$1" -ge $((CLAMD_NEED_LOW + 100)) ]; then echo "marginal: only with CLAMAV_MIN_FREE_MB at $((CLAMD_NEED_LOW + 100)), and clamd may be OOM-killed while it loads"
  else echo "NO (short by $((CLAMD_NEED_LOW + 100 - $1))MB even for the smallest clamd need)"; fi
}
say "as it is: projected free ${FREE}MB -> window starts: $(verdict "$FREE")"
BEST=$FREE
for pair in "A:$SET_A" "B:$SET_B" "C:$SET_C"; do
  name=${pair%%:*}; set=${pair#*:}
  freed=$(set_sum "$set"); proj=$((FREE + freed)); BEST=$proj
  say "pause set $name ($(detail "$set")): frees about ${freed}MB -> projected free ${proj}MB -> window starts: $(verdict "$proj")"
done
say "set C takes the public website down while the scanner runs; set B stops cron jobs and queues"
if [ "$BEST" -lt $((CLAMD_NEED_LOW + 100)) ]; then
  say "answer: no pause set makes a local window fit on this host; the scanner has to run elsewhere (docs/ops/REMOTE_CLAMD.md, then 96d-clamd-check.sh)"
else
  say "answer: a local window can fit only with the pause set and the CLAMAV_MIN_FREE_MB shown above; the remote scanner (docs/ops/REMOTE_CLAMD.md) still needs no pause at all"
fi
say "done (read-only)"
