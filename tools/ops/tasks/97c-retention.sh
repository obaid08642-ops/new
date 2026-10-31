#!/bin/bash
# Disk is at 84%: backup retention and old images. Two runs of the same task.
#   (APPLY empty)  DRY RUN: prints, per family, how many files there are, how many stay, how many would go and how many MB that frees; nothing is deleted.
#   APPLY=yes      (set in this file by the reviewer, after reading the dry run): deletes exactly what the dry run listed.
# Prints `status:` lines only: counts, MB and file names of backups (timestamps, no content). Never the environment.
# What stays (owner decision 2026-10-31), in $OPS_BACKUP_DIR (default /opt/nabdah/backups):
#   - the last 3 pre-deploy dumps          pre-deploy-*.gz
#   - the last 2 pre-mongo-recreate dumps  pre-mongo-recreate-*.gz and pre-recreate-*.gz (each family keeps 2), and the compose files saved with them (mongo-recreate-<ts>-docker-compose.*.yml)
#   - the last 7 nightly dumps             nabd_*.gz and nabd_*.gz.gpg, with their .oplogts file
#   Only a NON-EMPTY dump counts as one that stays: an empty file (the 0-byte dumps of runs 55 and 57) is not a restore point and never pushes a good dump out. The newest non-empty dump of a
#   family always stays. A file changed in the last 30 minutes is never touched (a backup or a deploy may be writing it). The off-server copies are not touched (the bucket expires them).
# Docker images: an image stays when a container (running or stopped) uses it, or it is one of the 2 newest of its repository (the current and the previous release), for the repositories we
# build (names starting with nabdah-, nabd-, deploy-: IMAGE_REPOS). Third-party images (mongo, redis, nginx...) are only removed when nothing tags them (dangling).
set -u
APPLY=""
B=${OPS_BACKUP_DIR:-/opt/nabdah/backups}
IMAGE_REPOS=${OPS_IMAGE_REPOS:-'^(nabdah-|nabd-|deploy-)'}
YOUNG_MIN=${OPS_YOUNG_MIN:-30}
DK="sudo -n docker"
echo "## retention"
say() { echo "status: retention: $*"; }
mb() { echo $(( ($1 + 524288) / 1048576 )); }
FREE0=$(df -Pm "$B" 2>/dev/null | awk 'NR==2 {print $4}'); USE0=$(df -Pm "$B" 2>/dev/null | awk 'NR==2 {print $5}')
say "mode: $([ "$APPLY" = yes ] && echo APPLY || echo 'dry run (nothing is deleted)'); backup dir disk use $USE0, free ${FREE0:-?} MB"
sudo -n test -d "$B" || { say "ABORT $B does not exist"; exit 1; }

DEL=$(mktemp); trap 'rm -f "$DEL"' EXIT   # one path per line: what goes
TOTAL_DEL=0; TOTAL_BYTES=0
family() {   # family <label> <keep> <glob...>: newest first by modification time
  local label=$1 keep=$2; shift 2
  local files f size age kept=0 nfiles=0 ndel=0 bytes=0 empty=0 young=0
  files=$(sudo -n sh -c "cd '$B' && ls -1t $* 2>/dev/null")
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    nfiles=$((nfiles+1))
    size=$(sudo -n stat -c %s "$B/$f" 2>/dev/null || echo 0)
    age=$(( ( $(date +%s) - $(sudo -n stat -c %Y "$B/$f" 2>/dev/null || date +%s) ) / 60 ))
    if [ "$age" -lt "$YOUNG_MIN" ]; then young=$((young+1)); [ "$size" -gt 0 ] && kept=$((kept+1)); continue; fi
    if [ "$size" -le 0 ]; then empty=$((empty+1)); ndel=$((ndel+1)); echo "$B/$f" >> "$DEL"; continue; fi
    if [ "$kept" -lt "$keep" ]; then kept=$((kept+1)); continue; fi
    ndel=$((ndel+1)); bytes=$((bytes+size)); echo "$B/$f" >> "$DEL"
  done <<< "$files"
  TOTAL_DEL=$((TOTAL_DEL+ndel)); TOTAL_BYTES=$((TOTAL_BYTES+bytes))
  say "$label: files=$nfiles stay=$((nfiles-ndel)) (keep $keep newest non-empty; $young changed in the last $YOUNG_MIN min are never touched) delete=$ndel (of which empty: $empty) frees ${bytes} bytes = $(mb $bytes) MB"
}
family "pre-deploy dumps" 3 'pre-deploy-*.gz'
family "pre-mongo-recreate dumps" 2 'pre-mongo-recreate-*.gz'
family "pre-recreate dumps" 2 'pre-recreate-*.gz'
family "nightly dumps" 7 'nabd_*.gz' 'nabd_*.gz.gpg'

# companions: the .oplogts of a nightly dump that goes, and the compose files saved with a pre-mongo-recreate dump that goes
COMP=0; COMPB=0
while IFS= read -r p; do
  [ -n "$p" ] || continue
  base=$(basename "$p")
  case "$base" in
    nabd_*.gz|nabd_*.gz.gpg) c="$p.oplogts"; sudo -n test -f "$c" && { echo "$c" >> "$DEL"; COMP=$((COMP+1)); COMPB=$((COMPB+$(sudo -n stat -c %s "$c")));} ;;
    pre-mongo-recreate-*.gz) ts=${base#pre-mongo-recreate-}; ts=${ts%.gz}
      for c in $(sudo -n sh -c "ls -1 '$B'/mongo-recreate-$ts-docker-compose.*.yml 2>/dev/null"); do echo "$c" >> "$DEL"; COMP=$((COMP+1)); COMPB=$((COMPB+$(sudo -n stat -c %s "$c"))); done ;;
  esac
done < <(sort -u "$DEL")
# orphans: an .oplogts whose dump is already gone is useless
for c in $(sudo -n sh -c "ls -1 '$B'/nabd_*.oplogts 2>/dev/null"); do d=${c%.oplogts}; sudo -n test -f "$d" || { echo "$c" >> "$DEL"; COMP=$((COMP+1)); }; done
say "companion files (the .oplogts of a dump that goes, the compose files saved with a recreate dump that goes, orphans): $COMP file(s), $(mb $COMPB) MB"
BK_MB=$(mb $((TOTAL_BYTES+COMPB)))

# ---- docker images
USED=$($DK ps -aq 2>/dev/null | xargs -r $DK inspect -f '{{.Image}}' 2>/dev/null | sed 's/^sha256://' | cut -c1-12 | sort -u)
IMG_DEL=$(mktemp); trap 'rm -f "$DEL" "$IMG_DEL"' EXIT
declare -A seen
IMG_TOTAL=0; IMG_BYTES=0; IMG_KEEP=0; IMG_GO=0; DANGLING=0
while IFS=$'\t' read -r id repo tag; do   # newest first, as docker lists them
  [ -n "$id" ] || continue
  IMG_TOTAL=$((IMG_TOTAL+1))
  size=$($DK image inspect -f '{{.Size}}' "$id" 2>/dev/null || echo 0)
  if echo "$USED" | grep -qx "${id:0:12}"; then IMG_KEEP=$((IMG_KEEP+1)); [ "$repo" != "<none>" ] && seen[$repo]=$(( ${seen[$repo]:-0} + 1 )); continue; fi
  if [ "$repo" = "<none>" ]; then DANGLING=$((DANGLING+1)); IMG_GO=$((IMG_GO+1)); IMG_BYTES=$((IMG_BYTES+size)); echo "$id" >> "$IMG_DEL"; continue; fi
  if echo "$repo" | grep -Eq "$IMAGE_REPOS"; then
    n=${seen[$repo]:-0}
    if [ "$n" -lt 2 ]; then seen[$repo]=$((n+1)); IMG_KEEP=$((IMG_KEEP+1)); continue; fi
    IMG_GO=$((IMG_GO+1)); IMG_BYTES=$((IMG_BYTES+size)); echo "$repo:$tag" >> "$IMG_DEL"
  else IMG_KEEP=$((IMG_KEEP+1)); fi
done < <($DK images --format '{{.ID}}	{{.Repository}}	{{.Tag}}' 2>/dev/null)
say "docker images: total=$IMG_TOTAL stay=$IMG_KEEP (used by a container, or the 2 newest of ours) delete=$IMG_GO (dangling: $DANGLING) frees about $(mb $IMG_BYTES) MB (shared layers may free less)"
say "TOTAL if applied: $(( $(sort -u "$DEL" | grep -c .) )) backup file(s) $BK_MB MB + $IMG_GO image(s) about $(mb $IMG_BYTES) MB"

if [ "$APPLY" != yes ]; then
  say "dry run only: nothing was deleted. To apply, set APPLY=yes in this task (after the review of the lines above)"
  exit 0
fi
N=0
while IFS= read -r p; do [ -n "$p" ] && sudo -n rm -f -- "$p" && N=$((N+1)); done < <(sort -u "$DEL")
R=0; while IFS= read -r i; do [ -n "$i" ] && $DK rmi "$i" >/dev/null 2>&1 && R=$((R+1)); done < "$IMG_DEL"
FREE1=$(df -Pm "$B" 2>/dev/null | awk 'NR==2 {print $4}'); USE1=$(df -Pm "$B" 2>/dev/null | awk 'NR==2 {print $5}')
say "APPLIED: removed $N backup file(s) and $R of $IMG_GO image(s) (an image still in use is left); disk use $USE0 -> $USE1, free ${FREE0:-?} -> ${FREE1:-?} MB"
