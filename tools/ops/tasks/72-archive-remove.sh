#!/bin/bash
# Owner, 2026-10-16: free the disk AFTER task 71 uploaded and verified the archive. A separate approved run on purpose:
# between 71 and 72 someone confirms the cf line "archive/ is NOT covered by any deleting rule" (cf:42), i.e. the bucket
# will not expire the archive in 30 days. Removes, each only after it is checked again here:
#   1. the four old folders /opt/nabdah/{nabdah-backend,patient-web,Napd-admin,import}: only if the manifest of
#      archive/<date>/ lists an object for it whose size in the bucket equals the manifest's bytes, and no container mounts it
#   2. the docker volume mongodb_secondary_data: same, and no container uses it
#   3. local nightly backups: all but the NEWEST nabd_*.gz, each only if the bucket holds mongodb/<name> with the same size
#      (pre-deploy and other backups are not touched)
# Never touches deploy/, releases/, a running container, a volume other than the one named, or the database.
# A missing, empty or mismatching manifest entry means that item is KEPT and the run exits 1. Public lines: "cleanup:".
set -u
D=${OPS_DEPLOY_DIR:-/opt/nabdah/deploy}
ROOT=${OPS_ROOT:-/opt/nabdah}
BK=${OPS_BACKUP_DIR:-/opt/nabdah/backups}
DATE=${OPS_ARCHIVE_DATE:-2026-10-16}
FOLDERS=${OPS_ARCHIVE_FOLDERS:-"nabdah-backend patient-web Napd-admin import"}
VOLUME_RE=${OPS_ARCHIVE_VOLUME_RE:-'(^|_)mongodb_secondary_data$'}
if [ "$(id -u)" != 0 ]; then exec sudo -n -E env "PATH=$PATH" bash "$0" "$@"; fi
DK=docker
P() { echo "cleanup: archive: $*"; }
# the mount checks below read the container list: no answer from docker must stop the run, not look like "nothing mounts it"
# (OPS_SKIP_DOCKER_CHECK=1 is for tests on a machine without a Docker daemon only)
[ "${OPS_SKIP_DOCKER_CHECK:-0}" = 1 ] || $DK ps -aq >/dev/null 2>&1 || { P "ABORT docker does not answer; mounts cannot be checked"; exit 1; }
. "$D/scripts/_backup-common.sh"; NABD_ENV_FILE=$D/.env.production nabd_load_env
ERR=$(private_bucket_error); [ -z "$ERR" ] || { P "ABORT $ERR"; exit 1; }
PREFIX="archive/$DATE"
free_gb() { df -Pk / | awk 'NR==2{printf "%.2f", $4/1048576}'; }
gb() { awk '{printf "%.2f GB", $1/1073741824}'; }
head_size() { backup_aws s3api head-object --bucket "$BACKUP_S3_BUCKET" --key "$1" --query ContentLength --output text 2>/dev/null; }
mounts() { $DK ps -aq | xargs -r $DK inspect -f '{{.Name}} {{range .Mounts}}{{.Source}} {{.Name}} {{end}}'; }
P "before: / free $(free_gb) GB"

T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
backup_aws s3 cp "s3://$BACKUP_S3_BUCKET/$PREFIX/MANIFEST.tsv" "$T/manifest" --only-show-errors 2>/dev/null
[ -s "$T/manifest" ] || { P "ABORT no $PREFIX/MANIFEST.tsv in the bucket: task 71 did not finish; nothing removed"; exit 1; }
P "manifest: $(wc -l < "$T/manifest") object(s) listed"
FAILED=0; FREED=0
# verified <key> -> prints the manifest's bytes when the bucket's object has exactly that size
verified() {
  local key=$1 want have
  want=$(awk -F'\t' -v k="$key" '$1 == k {print $2}' "$T/manifest")
  [ -n "$want" ] && [ "$want" -gt 0 ] 2>/dev/null || return 1
  have=$(head_size "$key"); [ "$have" = "$want" ] || return 1
  echo "$want"
}

# ---------------------------------------------------------------- 1. folders
for name in $FOLDERS; do
  case "$name" in ""|*/*|.*) P "$name: refused (not a plain folder name)"; FAILED=1; continue ;; esac
  dir="$ROOT/$name"
  [ -e "$dir" ] || { P "$name: already gone"; continue; }
  if [ -L "$dir" ] || [ ! -d "$dir" ]; then P "$name: KEPT, not a plain directory"; FAILED=1; continue; fi
  if mounts | grep -qF " $dir"; then P "$name: KEPT, a container mounts it"; FAILED=1; continue; fi
  b=$(verified "$PREFIX/$name.tar.gz") || { P "$name: KEPT, no matching verified object $PREFIX/$name.tar.gz in the bucket"; FAILED=1; continue; }
  s=$(du -sb "$dir" 2>/dev/null | cut -f1)
  rm -rf --one-file-system -- "$dir" && { FREED=$((FREED + ${s:-0})); P "$name: removed ($(echo ${s:-0} | gb); archived as $PREFIX/$name.tar.gz, $b bytes)"; } || { P "$name: FAIL removing"; FAILED=1; }
done

# ---------------------------------------------------------------- 2. the unused volume
VOL=$($DK volume ls -q 2>/dev/null | grep -E "$VOLUME_RE" | head -1)
if [ -z "$VOL" ]; then P "volume: already gone"
else
  USERS=$($DK ps -aq --filter "volume=$VOL" | wc -l)
  if [ "$USERS" != 0 ]; then P "volume $VOL: KEPT, $USERS container(s) use it"; FAILED=1
  elif b=$(verified "$PREFIX/volume-$VOL.tar.gz"); then
    mp=$($DK volume inspect -f '{{.Mountpoint}}' "$VOL"); s=$(du -sb "$mp" 2>/dev/null | cut -f1)
    $DK volume rm "$VOL" >/dev/null 2>&1 && { FREED=$((FREED + ${s:-0})); P "volume $VOL: removed ($(echo ${s:-0} | gb); archived as $PREFIX/volume-$VOL.tar.gz, $b bytes)"; } || { P "volume $VOL: FAIL removing"; FAILED=1; }
  else P "volume $VOL: KEPT, no matching verified object in the bucket"; FAILED=1; fi
fi

# ---------------------------------------------------------------- 3. nightly backups: keep the newest
NEWEST=$(ls -1t "$BK"/nabd_*.gz 2>/dev/null | head -1)
if [ -z "$NEWEST" ]; then P "nightly backups: none here"
else
  P "nightly backups: keeping the newest, $(basename "$NEWEST")"
  for f in $(ls -1t "$BK"/nabd_*.gz | tail -n +2); do
    n=$(basename "$f"); ls=$(stat -c %s "$f"); rs=$(head_size "mongodb/$n")
    if [ -n "$rs" ] && [ "$rs" = "$ls" ]; then
      rm -f -- "$f" && { FREED=$((FREED + ls)); P "backup $n: removed ($(echo $ls | gb); the bucket has mongodb/$n, same size)"; }
    else P "backup $n: KEPT, the bucket has ${rs:-nothing} for mongodb/$n, here $ls bytes"; FAILED=1; fi
  done
fi
P "after: / free $(free_gb) GB; removed about $(echo $FREED | gb)"
[ $FAILED = 0 ] && { P "OK"; exit 0; }
P "NOT ALL REMOVED: items marked KEPT/FAIL above were left untouched"; exit 1
