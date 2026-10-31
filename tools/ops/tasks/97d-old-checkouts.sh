#!/bin/bash
# Disk is at 87%: old source checkouts under /opt/nabdah (with node_modules) and old release dirs. Two runs of the same task.
#   (APPLY empty)  DRY RUN: for each candidate directory prints its size and the evidence that nothing uses it; nothing is changed.
#   APPLY=yes      (set in this file by the reviewer, after reading the dry run): for each directory that is STILL proven unused, archives it
#                  (tar.gz of everything except node_modules) to $OPS_BACKUP_DIR, checks the archive, deletes the directory and prints the MB freed.
# A directory is proven unused only when ALL of these find nothing that refers to it (the evidence is printed per directory):
#   1. compose files   under $OPS_ROOT/deploy and $OPS_ROOT (depth 2): its absolute path, or a relative build context / volume path (../name, ./name) to it
#   2. containers      any container, running or stopped: a bind mount from it, a compose working_dir label equal to it, or a working dir inside it
#   3. cron            /etc/cron.d, /etc/crontab, /var/spool/cron, the crontab of root and of the deploy user: any line naming it
#   4. systemd         units and timers under /etc/systemd/system and /lib/systemd/system naming it
#   5. deploy scripts  $OPS_ROOT/deploy/scripts and the compose build contexts above (a script that cd's into it)
# One hit anywhere = IN USE: that directory is left alone and the hit is printed. Docker VOLUMES are never touched: mongodb_secondary_data is only reported.
# Also keeps only the current and the previous release dir in $OPS_RELEASE_DIR (tools/ops/release/prune-releases.sh; the upload calls the same script).
# Prints `status:` lines only: paths, sizes and counts. Never the environment.
set -u
APPLY="yes"
ROOT=${OPS_ROOT:-/opt/nabdah}
B=${OPS_BACKUP_DIR:-$ROOT/backups}
REL=${OPS_RELEASE_DIR:-$ROOT/releases}
CANDIDATES=${OPS_CHECKOUT_DIRS:-"nabdah-backend patient-web Napd-admin"}   # names under $ROOT, nothing else is ever a candidate
CRON_PATHS=${OPS_CRON_PATHS:-"/etc/cron.d /etc/crontab /var/spool/cron"}
SYSTEMD_DIRS=${OPS_SYSTEMD_DIRS:-"/etc/systemd/system /lib/systemd/system"}
VOLUME=${OPS_REPORT_VOLUME:-mongodb_secondary_data}
DK="sudo -n docker"
SUDO="sudo -n"
HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
echo "## old checkouts"
say() { echo "status: old-checkouts: $*"; }
mb() { echo $(( ($1 + 524288) / 1048576 )); }
dirmb() { local k; k=$($SUDO du -sk "$1" 2>/dev/null | cut -f1); echo $(( (${k:-0} + 512) / 1024 )); }
FREE0=$(df -Pm "$ROOT" 2>/dev/null | awk 'NR==2 {print $4}'); USE0=$(df -Pm "$ROOT" 2>/dev/null | awk 'NR==2 {print $5}')
say "mode: $([ "$APPLY" = yes ] && echo APPLY || echo 'dry run (nothing is changed)'); $ROOT disk use $USE0, free ${FREE0:-?} MB"
$SUDO test -d "$ROOT" || { say "ABORT $ROOT does not exist"; exit 1; }

COMPOSE_FILES=$($SUDO sh -c "find '$ROOT/deploy' '$ROOT' -maxdepth 2 \( -name 'docker-compose*.yml' -o -name 'docker-compose*.yaml' -o -name 'compose*.yml' \) -not -path '*/node_modules/*' 2>/dev/null" | sort -u)
CONTAINERS=$($DK ps -aq 2>/dev/null)

# evidence <dir>: prints one line per hit as "<kind>: <where>: <text>"; no output = nothing refers to it
evidence() {
  local dir=$1 name; name=$(basename "$dir")
  local pat="(^|[^A-Za-z0-9_.-])(${dir}|\\.\\.?/${name})([/\"' :]|\$)"
  local f
  # 1. compose files (a file that lives INSIDE the candidate does not count as a reference to it)
  for f in $COMPOSE_FILES; do
    case "$f" in "$dir"/*) continue;; esac
    $SUDO grep -nE "$pat" "$f" 2>/dev/null | head -3 | sed "s|^|compose: $f: |"
  done
  # 2. containers: bind mounts, compose working_dir label, working dir
  local c
  for c in $CONTAINERS; do
    $DK inspect -f '{{range .Mounts}}{{.Source}}{{"\n"}}{{end}}{{index .Config.Labels "com.docker.compose.project.working_dir"}}{{"\n"}}{{.Config.WorkingDir}}' "$c" 2>/dev/null \
      | grep -E "^${dir}(/|$)" | head -2 | sed "s|^|container: $c: |"
  done
  # 3. cron
  local p
  for p in $CRON_PATHS; do $SUDO grep -rnE "$pat" "$p" 2>/dev/null | head -3 | sed "s|^|cron: |"; done
  for u in root ${OPS_DEPLOY_USER:-}; do [ -n "$u" ] && sudo -n crontab -l -u "$u" 2>/dev/null | grep -nE "$pat" | head -3 | sed "s|^|cron: crontab $u: |"; done
  # 4. systemd
  for p in $SYSTEMD_DIRS; do $SUDO grep -rnE "$pat" --include='*.service' --include='*.timer' --include='*.mount' --include='*.path' "$p" 2>/dev/null | head -3 | sed "s|^|systemd: |"; done
  # 5. deploy scripts
  $SUDO grep -rnE "$pat" "$ROOT/deploy/scripts" 2>/dev/null | head -3 | sed "s|^|script: |"
}

USED_DIRS=0; FREE_DIRS=0; PLAN=$(mktemp); trap 'rm -f "$PLAN"' EXIT
for name in $CANDIDATES; do
  case "$name" in */*|""|.|..) say "$name: skipped (a candidate is a plain directory name under $ROOT)"; continue;; esac
  dir="$ROOT/$name"
  if ! $SUDO test -d "$dir"; then say "$name: not present"; continue; fi
  if $SUDO test -L "$dir"; then say "$name: is a symlink: left alone"; USED_DIRS=$((USED_DIRS+1)); continue; fi
  total=$(dirmb "$dir")
  nm=0; for n in $($SUDO find "$dir" -maxdepth 3 -type d -name node_modules -prune 2>/dev/null); do nm=$((nm + $(dirmb "$n"))); done
  ev=$(evidence "$dir")
  hits=$(printf '%s' "$ev" | grep -c .)
  say "$name: size ${total} MB (node_modules ${nm} MB, archived part about $((total - nm)) MB, compressed smaller)"
  for kind in compose container cron systemd script; do
    k=$(printf '%s\n' "$ev" | grep -c "^$kind:" )
    say "$name: evidence $kind: $k reference(s)"
  done
  if [ "$hits" -gt 0 ]; then
    printf '%s\n' "$ev" | head -12 | while IFS= read -r l; do say "$name:   $l"; done
    say "$name: IN USE: $hits reference(s) found: left alone"; USED_DIRS=$((USED_DIRS+1))
  else
    say "$name: UNREFERENCED: nothing in compose files, containers, cron, systemd or deploy scripts names it: would archive (without node_modules) to $B/old-checkout-$name-<timestamp>.tar.gz, delete it and free about ${total} MB"
    FREE_DIRS=$((FREE_DIRS+1)); echo "$name" >> "$PLAN"
  fi
done

# the volume: reported only
if [ -n "$VOLUME" ]; then
  if $DK volume inspect "$VOLUME" >/dev/null 2>&1; then
    users=$($DK ps -a --filter "volume=$VOLUME" --format '{{.Names}} ({{.Status}})' 2>/dev/null | paste -sd, -)
    inc=$(printf '%s\n' "$COMPOSE_FILES" | while read -r f; do [ -n "$f" ] && $SUDO grep -ln "$VOLUME" "$f" 2>/dev/null; done | paste -sd, -)
    say "volume $VOLUME: exists; containers using it: ${users:-none}; compose files naming it: ${inc:-none}; $([ -z "$users" ] && [ -z "$inc" ] && echo 'NOTHING USES IT (the reviewer decides; this task never touches a volume)' || echo 'in use, keep')"
  else
    say "volume $VOLUME: does not exist"
  fi
fi

# releases
say "releases in $REL: $(REL_ROOT="$REL" KEEP=2 SUDO="$SUDO" bash "$HERE/../release/prune-releases.sh" | tail -1)"

say "TOTAL: $FREE_DIRS directory(ies) would be archived and deleted, $USED_DIRS left alone as in use"
if [ "$APPLY" != yes ]; then
  say "dry run only: nothing was changed. To apply, set APPLY=yes in this task (after the review of the lines above)"
  exit 0
fi

TS=$(date -u +%Y%m%d-%H%M%S)
$SUDO mkdir -p "$B"
DONE=0
while IFS= read -r name; do
  [ -n "$name" ] || continue
  dir="$ROOT/$name"
  # proven again right now, not trusted from the dry run
  ev=$(evidence "$dir")
  if [ -n "$ev" ]; then say "$name: now referenced, left alone"; continue; fi
  tgz="$B/old-checkout-$name-$TS.tar.gz"
  before=$(dirmb "$dir")
  if ! $SUDO tar -czf "$tgz" --exclude=node_modules -C "$ROOT" "$name" 2>/dev/null; then say "$name: ABORT the archive failed: nothing deleted"; $SUDO rm -f "$tgz"; continue; fi
  files=$($SUDO tar -tzf "$tgz" 2>/dev/null | grep -vc '/$')
  size=$($SUDO stat -c %s "$tgz" 2>/dev/null || echo 0)
  if [ "$size" -le 0 ] || [ "${files:-0}" -le 0 ]; then say "$name: ABORT the archive is empty or unreadable: nothing deleted"; continue; fi
  say "$name: archived $files file(s) to $tgz ($(mb "$size") MB)"
  $SUDO rm -rf -- "$dir"
  if $SUDO test -e "$dir"; then say "$name: ERROR the directory is still there"; continue; fi
  say "$name: deleted; freed about ${before} MB (archive kept: $(mb "$size") MB)"; DONE=$((DONE+1))
done < "$PLAN"
say "releases: $(APPLY=yes REL_ROOT="$REL" KEEP=2 SUDO="$SUDO" bash "$HERE/../release/prune-releases.sh" | tail -1)"
FREE1=$(df -Pm "$ROOT" 2>/dev/null | awk 'NR==2 {print $4}'); USE1=$(df -Pm "$ROOT" 2>/dev/null | awk 'NR==2 {print $5}')
say "APPLIED: $DONE directory(ies) archived and deleted; disk use $USE0 -> $USE1, free ${FREE0:-?} -> ${FREE1:-?} MB"
