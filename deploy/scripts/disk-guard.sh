#!/bin/bash
# ═══ Disk guard: keep / above DISK_GUARD_TRIGGER_PCT % free (default 25, so the monitor's 20 % warning stays quiet) ═══
# Run daily from /etc/cron.d/nabd-backups at an off-peak hour. Acts only when the free space is below the trigger, and only on what can be rebuilt:
#   1. docker build cache and dangling images            (docker builder prune / image prune)
#   2. unused docker images older than 7 days            (an image any container uses is never removed; the previous release image stays 7 days for a rollback)
#   3. release dirs beyond the current + previous one    (tools/ops/release/prune-releases.sh, when the repo's tools dir is on the host)
#   4. the systemd journal down to 100 MB
# It never touches backups (the 97c-retention.sh task applies the owner's "one running, one backup" rule by hand), volumes, or uploaded data.
# Prints status lines only (sizes and counts). Test hooks (tools/ops/tests/test_disk_guard.py): DISK_GUARD_DF_OUTPUT, DISK_GUARD_DOCKER,
# DISK_GUARD_JOURNALCTL, DISK_GUARD_PRUNE_RELEASES, DISK_GUARD_DRY=1 (print the commands, run none).
set -u
TRIGGER=${DISK_GUARD_TRIGGER_PCT:-25}
DOCKER=${DISK_GUARD_DOCKER:-docker}
JOURNALCTL=${DISK_GUARD_JOURNALCTL:-journalctl}
HERE=$(cd "$(dirname "$0")" && pwd)
PRUNE=${DISK_GUARD_PRUNE_RELEASES:-$HERE/../../tools/ops/release/prune-releases.sh}
UNUSED_IMAGE_AGE=${DISK_GUARD_IMAGE_AGE:-168h}
say() { echo "disk-guard: $*"; }
free_pct() {
  local df; if [ -n "${DISK_GUARD_DF_OUTPUT:-}" ]; then df=$DISK_GUARD_DF_OUTPUT; else df=$(df -Pk /); fi
  printf '%s\n' "$df" | awk 'NR==2{ if ($2>0) printf "%d", ($4*100)/$2; else print 0 }'
}
act() {   # act <label> <command...>
  local label=$1; shift
  if [ "${DISK_GUARD_DRY:-0}" = 1 ]; then say "dry: $label: $*"; return 0; fi
  if "$@" >/dev/null 2>&1; then say "$label: done"; else say "$label: failed or not available (continuing)"; fi
}

BEFORE=$(free_pct)
if [ "$BEFORE" -ge "$TRIGGER" ]; then say "${BEFORE}% free, at or above ${TRIGGER}%: nothing to do"; exit 0; fi
say "${BEFORE}% free, below ${TRIGGER}%: cleaning what can be rebuilt"
act "docker build cache" $DOCKER builder prune -f
act "docker dangling images" $DOCKER image prune -f
act "docker unused images older than ${UNUSED_IMAGE_AGE}" $DOCKER image prune -a -f --filter "until=${UNUSED_IMAGE_AGE}"
if [ -f "$PRUNE" ]; then act "release dirs (current + previous stay)" env APPLY=yes KEEP=2 bash "$PRUNE"; else say "release dirs: prune-releases.sh not on this host, skipped"; fi
act "systemd journal to 100M" $JOURNALCTL --vacuum-size=100M
AFTER=$(free_pct)
say "free ${BEFORE}% -> ${AFTER}%"
[ "$AFTER" -ge "${DISK_GUARD_WARN_PCT:-20}" ] || { say "STILL BELOW ${DISK_GUARD_WARN_PCT:-20}% free: backups or data need a decision (run the 97c retention task)"; exit 2; }
exit 0
